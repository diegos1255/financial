package com.financial.gmail.service;

import com.financial.gmail.api.GmailApiClient;
import com.financial.gmail.dto.inbox.MessageDetail;
import com.financial.gmail.dto.inbox.PagedThreadsResponse;
import com.financial.gmail.dto.inbox.ThreadDetail;
import com.financial.gmail.dto.inbox.ThreadSummary;
import com.financial.gmail.model.enums.GmailCategory;
import com.financial.gmail.util.MessageParser;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class GmailInboxService {

    private static final List<String> SUMMARY_HEADERS = List.of("From", "Subject", "Date");
    private static final String UNREAD_LABEL = "UNREAD";

    private final GmailApiClient api;
    private final MessageParser parser;

    public GmailInboxService(GmailApiClient api, MessageParser parser) {
        this.api = api;
        this.parser = parser;
    }

    public PagedThreadsResponse listThreads(GmailCategory category, String pageToken, int pageSize) {
        int size = Math.max(1, Math.min(pageSize, 50));
        // Usa o operador de search do Gmail (`category:xxx`) que aplica a mesma
        // classificacao exclusiva do Gmail Web (uma msg aparece em uma unica aba).
        // labelIds=[INBOX] restringe a apenas mensagens na inbox visivel.
        String query = "category:" + category.name().toLowerCase();
        Map<String, Object> resp = api.listMessages(
                query,
                List.of("INBOX"),
                size,
                pageToken
        );

        List<ThreadSummary> summaries = buildThreadSummaries(resp);
        String next = (String) resp.get("nextPageToken");
        return new PagedThreadsResponse(summaries, next);
    }

    public PagedThreadsResponse listThreadsByLabel(String labelId, String pageToken, int pageSize) {
        int size = Math.max(1, Math.min(pageSize, 50));
        Map<String, Object> resp = api.listMessages(
                null,
                List.of(labelId),
                size,
                pageToken
        );
        List<ThreadSummary> summaries = buildThreadSummaries(resp);
        String next = (String) resp.get("nextPageToken");
        return new PagedThreadsResponse(summaries, next);
    }

    public ThreadDetail getThread(String threadId) {
        Map<String, Object> thread = api.getThread(threadId, "full");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> messages = (List<Map<String, Object>>) thread.get("messages");
        List<MessageDetail> details = new ArrayList<>();
        String subject = null;
        if (messages != null) {
            for (Map<String, Object> msg : messages) {
                MessageDetail m = toMessageDetail(msg);
                details.add(m);
                if (subject == null) {
                    subject = extractSubject(msg);
                }
            }
        }
        return new ThreadDetail(threadId, subject != null ? subject : "(sem assunto)", details);
    }

    public void markThreadAsRead(String threadId) {
        api.modifyThread(threadId, List.of(), List.of(UNREAD_LABEL));
    }

    // ---- helpers ----

    @SuppressWarnings("unchecked")
    private List<ThreadSummary> buildThreadSummaries(Map<String, Object> listResponse) {
        List<Map<String, Object>> messages = (List<Map<String, Object>>) listResponse.get("messages");
        if (messages == null || messages.isEmpty()) return List.of();

        // Preserva ordem, agrupa por threadId, faz um getMessage(metadata) por message
        Map<String, ThreadAccumulator> byThread = new LinkedHashMap<>();
        for (Map<String, Object> m : messages) {
            String messageId = (String) m.get("id");
            String threadId = (String) m.get("threadId");
            if (messageId == null || threadId == null) continue;

            Map<String, Object> full;
            try {
                full = api.getMessage(messageId, "metadata", SUMMARY_HEADERS);
            } catch (RuntimeException e) {
                continue;
            }

            byThread.computeIfAbsent(threadId, id -> new ThreadAccumulator()).add(full, parser);
        }

        List<ThreadSummary> out = new ArrayList<>();
        for (Map.Entry<String, ThreadAccumulator> e : byThread.entrySet()) {
            ThreadAccumulator acc = e.getValue();
            out.add(new ThreadSummary(
                    e.getKey(),
                    acc.snippet,
                    acc.from,
                    acc.subject,
                    acc.date,
                    acc.unread,
                    acc.messageCount
            ));
        }
        return out;
    }

    private MessageDetail toMessageDetail(Map<String, Object> msg) {
        @SuppressWarnings("unchecked")
        Map<String, Object> payload = (Map<String, Object>) msg.get("payload");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> headers = payload != null
                ? (List<Map<String, Object>>) payload.get("headers")
                : List.of();
        @SuppressWarnings("unchecked")
        List<String> labelIds = (List<String>) msg.getOrDefault("labelIds", List.of());

        String from = parser.extractHeader(headers, "From");
        String to = parser.extractHeader(headers, "To");
        String cc = parser.extractHeader(headers, "Cc");
        String date = parser.extractHeader(headers, "Date");
        Long internal = toLong(msg.get("internalDate"));

        return new MessageDetail(
                (String) msg.get("id"),
                from,
                parser.splitAddresses(to),
                parser.splitAddresses(cc),
                parser.parseDate(date, internal),
                parser.extractHtmlBody(payload),
                labelIds,
                parser.isUnread(labelIds)
        );
    }

    private String extractSubject(Map<String, Object> msg) {
        @SuppressWarnings("unchecked")
        Map<String, Object> payload = (Map<String, Object>) msg.get("payload");
        if (payload == null) return null;
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> headers = (List<Map<String, Object>>) payload.get("headers");
        return parser.extractHeader(headers, "Subject");
    }

    private Long toLong(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.longValue();
        try { return Long.parseLong(o.toString()); } catch (NumberFormatException e) { return null; }
    }

    /** Acumulador pra dados agregados de uma thread */
    private static class ThreadAccumulator {
        String snippet;
        String from;
        String subject;
        OffsetDateTime date;
        boolean unread;
        int messageCount;

        @SuppressWarnings("unchecked")
        void add(Map<String, Object> msg, MessageParser parser) {
            messageCount++;
            List<String> labelIds = (List<String>) msg.getOrDefault("labelIds", List.of());
            if (parser.isUnread(labelIds)) unread = true;

            Map<String, Object> payload = (Map<String, Object>) msg.get("payload");
            List<Map<String, Object>> headers = payload != null
                    ? (List<Map<String, Object>>) payload.get("headers")
                    : List.of();

            // usa a última mensagem lida (mais recente) como referência de subject/from/date
            String msgSubject = parser.extractHeader(headers, "Subject");
            String msgFrom = parser.extractHeader(headers, "From");
            String msgDate = parser.extractHeader(headers, "Date");
            Long internal = null;
            Object internalObj = msg.get("internalDate");
            if (internalObj instanceof Number n) internal = n.longValue();
            else if (internalObj != null) {
                try { internal = Long.parseLong(internalObj.toString()); } catch (NumberFormatException ignored) {}
            }

            OffsetDateTime parsedDate = parser.parseDate(msgDate, internal);
            if (this.date == null || (parsedDate != null && parsedDate.isAfter(this.date))) {
                this.date = parsedDate;
                this.from = msgFrom;
                this.subject = msgSubject;
            }

            Object rawSnippet = msg.get("snippet");
            if (rawSnippet != null && (this.snippet == null || this.snippet.isBlank())) {
                this.snippet = rawSnippet.toString();
            }
        }
    }
}
