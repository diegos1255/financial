package com.financial.chat.util;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Chunker especifico para os Markdown das specs do projeto.
 *
 * Estrategia:
 * <ol>
 *   <li>Split por headers de nivel 2 ({@code ##}) — cada seção vira 1+ chunks</li>
 *   <li>Se a seção &gt; maxTokens: split por parágrafo (linha em branco)</li>
 *   <li>Se um parágrafo isolado &gt; maxTokens: split fixo por caracteres</li>
 * </ol>
 *
 * O metadata {@code section} preserva o título do header pai. Se um chunk vier
 * de fallback (fixo por chars), {@code section} continua o do header, mas o
 * chunk pode não ser semanticamente auto-contido.
 */
@Component
public class MarkdownChunker {

    /** Fator aproximado: chars/4 ≈ tokens. */
    private static final int CHARS_PER_TOKEN = 4;

    public List<Chunk> chunk(String markdown, int maxTokens) {
        List<Chunk> out = new ArrayList<>();
        if (markdown == null || markdown.isBlank()) return out;

        int maxChars = maxTokens * CHARS_PER_TOKEN;

        List<Section> sections = splitBySections(markdown);
        for (Section s : sections) {
            if (approxTokens(s.body) <= maxTokens) {
                if (!s.body.isBlank()) out.add(new Chunk(s.title, s.body.trim()));
                continue;
            }
            // Seção grande: split por parágrafo
            for (String para : s.body.split("\\n\\s*\\n")) {
                String trimmed = para.trim();
                if (trimmed.isEmpty()) continue;
                if (approxTokens(trimmed) <= maxTokens) {
                    out.add(new Chunk(s.title, trimmed));
                } else {
                    // Parágrafo grande demais: split fixo por chars
                    for (int i = 0; i < trimmed.length(); i += maxChars) {
                        int end = Math.min(i + maxChars, trimmed.length());
                        out.add(new Chunk(s.title, trimmed.substring(i, end)));
                    }
                }
            }
        }
        return out;
    }

    private List<Section> splitBySections(String markdown) {
        List<Section> sections = new ArrayList<>();
        String[] lines = markdown.split("\\r?\\n");

        String currentTitle = null;
        StringBuilder currentBody = new StringBuilder();
        boolean inFence = false;

        for (String line : lines) {
            // Ignora headers dentro de fenced code blocks
            if (line.startsWith("```")) inFence = !inFence;

            if (!inFence && line.startsWith("## ") && !line.startsWith("### ")) {
                // Fecha seção anterior
                flushSection(sections, currentTitle, currentBody);
                currentTitle = line.substring(3).trim();
                currentBody.setLength(0);
            } else {
                currentBody.append(line).append('\n');
            }
        }
        flushSection(sections, currentTitle, currentBody);
        return sections;
    }

    private void flushSection(List<Section> sections, String title, StringBuilder body) {
        if (body.length() == 0) return;
        String bodyStr = body.toString().trim();
        if (bodyStr.isEmpty()) return;
        sections.add(new Section(title, bodyStr));
    }

    private int approxTokens(String text) {
        return text.length() / CHARS_PER_TOKEN;
    }

    public static int estimateTokens(String text) {
        return text == null ? 0 : text.length() / CHARS_PER_TOKEN;
    }

    public record Chunk(String section, String content) {}

    private record Section(String title, String body) {}
}
