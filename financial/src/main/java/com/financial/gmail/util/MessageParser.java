package com.financial.gmail.util;

import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Parseia dados de mensagens da Gmail API (payload nested com parts, headers, base64url body).
 * Recebe Map genérico (do JSON deserializado) pra evitar depender de tipos do google-api-client.
 */
@Component
public class MessageParser {

    private static final DateTimeFormatter RFC_2822 =
            DateTimeFormatter.ofPattern("EEE, d MMM uuuu HH:mm:ss Z", Locale.ENGLISH);

    /**
     * Busca header (case-insensitive) na lista de headers do payload.
     */
    public String extractHeader(List<Map<String, Object>> headers, String name) {
        if (headers == null) return null;
        for (Map<String, Object> h : headers) {
            Object hName = h.get("name");
            if (hName != null && name.equalsIgnoreCase(hName.toString())) {
                Object value = h.get("value");
                return value != null ? value.toString() : null;
            }
        }
        return null;
    }

    /**
     * Duas passadas na árvore de parts:
     * 1. Procura recursivamente text/html na arvore inteira (prioridade absoluta)
     * 2. Se nao achou, procura text/plain e embrulha em <pre> com escape
     *
     * Motivo: emails no Gmail geralmente vem como multipart/alternative com text/plain
     * antes de text/html. Um DFS ingenuo que faz fallback dentro da recursao pega o
     * text/plain primeiro e nunca chega no text/html. Separar em 2 passadas garante
     * que o HTML e sempre preferido quando existe em qualquer galho da arvore.
     */
    public String extractHtmlBody(Map<String, Object> payload) {
        if (payload == null) return "";

        String html = findBodyByMime(payload, "text/html");
        if (html != null && !html.isEmpty()) return html;

        String plain = findBodyByMime(payload, "text/plain");
        if (plain != null && !plain.isEmpty()) {
            return "<pre style=\"white-space: pre-wrap; font-family: inherit;\">"
                    + escapeHtml(plain) + "</pre>";
        }
        return "";
    }

    @SuppressWarnings("unchecked")
    private String findBodyByMime(Map<String, Object> payload, String desiredMime) {
        if (payload == null) return null;

        String direct = tryDecodeBody(payload, desiredMime);
        if (direct != null && !direct.isEmpty()) return direct;

        List<Map<String, Object>> parts = (List<Map<String, Object>>) payload.get("parts");
        if (parts != null) {
            for (Map<String, Object> part : parts) {
                String found = findBodyByMime(part, desiredMime);
                if (found != null && !found.isEmpty()) return found;
            }
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private String tryDecodeBody(Map<String, Object> part, String desiredMime) {
        Object mimeType = part.get("mimeType");
        if (mimeType == null || !desiredMime.equalsIgnoreCase(mimeType.toString())) return null;
        Map<String, Object> body = (Map<String, Object>) part.get("body");
        if (body == null) return null;
        Object data = body.get("data");
        if (data == null) return null;
        try {
            byte[] decoded = Base64.getUrlDecoder().decode(data.toString());
            return new String(decoded, StandardCharsets.UTF_8);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    public OffsetDateTime parseDate(String rfc2822Date, Long internalDateMillis) {
        if (rfc2822Date != null) {
            try {
                // remove parênteses no fim tipo " (UTC)" que às vezes vem
                String cleaned = rfc2822Date.replaceAll("\\s*\\([^)]*\\)\\s*$", "").trim();
                return OffsetDateTime.parse(cleaned, RFC_2822);
            } catch (DateTimeParseException ignored) {
                // fallback pra internalDate
            }
        }
        if (internalDateMillis != null) {
            return OffsetDateTime.ofInstant(
                    java.time.Instant.ofEpochMilli(internalDateMillis), ZoneOffset.UTC);
        }
        return null;
    }

    /**
     * Parseia lista de emails separados por vírgula (padrão de To/Cc). Ex: '"João" <joao@x>, maria@y'.
     * Retorna versão simplificada: só o endereço + display name concatenado.
     */
    public List<String> splitAddresses(String header) {
        List<String> out = new ArrayList<>();
        if (header == null || header.isBlank()) return out;
        // divisão simples por vírgula (não trata vírgulas dentro de aspas — aceitável pra display)
        for (String part : header.split(",")) {
            String trimmed = part.trim();
            if (!trimmed.isEmpty()) out.add(trimmed);
        }
        return out;
    }

    public boolean isUnread(List<String> labelIds) {
        return labelIds != null && labelIds.contains("UNREAD");
    }

    /**
     * Percorre a arvore de parts do payload procurando anexos. Um anexo tem
     * body.attachmentId presente e filename nao-vazio (o filename vazio =
     * pedaco inline do multipart/alternative, nao anexo real).
     */
    public List<AttachmentInfo> extractAttachments(Map<String, Object> payload) {
        List<AttachmentInfo> out = new ArrayList<>();
        collectAttachments(payload, out);
        return out;
    }

    @SuppressWarnings("unchecked")
    private void collectAttachments(Map<String, Object> part, List<AttachmentInfo> out) {
        if (part == null) return;
        Map<String, Object> body = (Map<String, Object>) part.get("body");
        String filename = part.get("filename") != null ? part.get("filename").toString() : null;
        String attachmentId = body != null && body.get("attachmentId") != null
                ? body.get("attachmentId").toString() : null;
        if (attachmentId != null && filename != null && !filename.isBlank()) {
            String mimeType = part.get("mimeType") != null ? part.get("mimeType").toString() : "application/octet-stream";
            Integer size = body.get("size") instanceof Number n ? n.intValue() : null;
            out.add(new AttachmentInfo(attachmentId, filename, mimeType, size));
        }
        List<Map<String, Object>> parts = (List<Map<String, Object>>) part.get("parts");
        if (parts != null) {
            for (Map<String, Object> child : parts) collectAttachments(child, out);
        }
    }

    public record AttachmentInfo(String id, String filename, String mimeType, Integer size) {}

    private String escapeHtml(String s) {
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
