package com.financial.chat.service;

import com.financial.chat.client.GeminiChatClient;
import com.financial.chat.client.GeminiEmbeddingClient;
import com.financial.chat.dto.ChatAnswer;
import com.financial.chat.dto.ChunkSource;
import com.financial.chat.exception.GeminiCallException;
import com.financial.chat.util.PromptBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ChatQueryService {

    private static final Logger log = LoggerFactory.getLogger(ChatQueryService.class);

    private static final String NO_CONTEXT_ANSWER =
            "Nao encontrei essa informacao nas specs. Talvez ainda nao esteja documentado.";

    private static final String QUOTA_EXCEEDED_ANSWER =
            "O limite diario gratuito do assistente foi atingido. A quota reseta a meia-noite UTC "
                    + "(~21h no horario de Brasilia). Tente novamente mais tarde.";

    private static final String UPSTREAM_ERROR_ANSWER =
            "O assistente esta temporariamente indisponivel. Tente de novo em alguns segundos.";

    private final GeminiEmbeddingClient embeddingClient;
    private final GeminiChatClient chatClient;
    private final RagRetrievalService retrieval;
    private final PromptBuilder promptBuilder;

    public ChatQueryService(GeminiEmbeddingClient embeddingClient,
                             GeminiChatClient chatClient,
                             RagRetrievalService retrieval,
                             PromptBuilder promptBuilder) {
        this.embeddingClient = embeddingClient;
        this.chatClient = chatClient;
        this.retrieval = retrieval;
        this.promptBuilder = promptBuilder;
    }

    public ChatAnswer answer(String question) {
        long started = System.currentTimeMillis();
        float[] queryEmbedding;
        try {
            queryEmbedding = embeddingClient.embed(question);
        } catch (GeminiCallException e) {
            long took = System.currentTimeMillis() - started;
            String fallback = isQuotaError(e) ? QUOTA_EXCEEDED_ANSWER : UPSTREAM_ERROR_ANSWER;
            log.warn("Chat: falha no embed da pergunta ({}). Retornando resposta amigavel. question=\"{}\"",
                    e.getMessage(), truncate(question, 80));
            return new ChatAnswer(fallback, List.of(), took);
        }

        List<RetrievedChunk> chunks = retrieval.topK(queryEmbedding);

        if (chunks.isEmpty()) {
            long took = System.currentTimeMillis() - started;
            log.warn("Chat: sem chunks acima do minScore. question=\"{}\" tookMs={}",
                    truncate(question, 80), took);
            return new ChatAnswer(NO_CONTEXT_ANSWER, List.of(), took);
        }

        String prompt = promptBuilder.build(question, chunks);
        String answer;
        try {
            answer = chatClient.generate(prompt);
        } catch (GeminiCallException e) {
            long took = System.currentTimeMillis() - started;
            String fallback = isQuotaError(e) ? QUOTA_EXCEEDED_ANSWER : UPSTREAM_ERROR_ANSWER;
            log.warn("Chat: falha no generate ({}). Retornando resposta amigavel. question=\"{}\"",
                    e.getMessage(), truncate(question, 80));
            return new ChatAnswer(fallback, List.of(), took);
        }
        long took = System.currentTimeMillis() - started;

        List<ChunkSource> sources = chunks.stream()
                .map(c -> new ChunkSource(c.sourcePath(), c.section(), c.score()))
                .toList();

        log.info("Chat: question=\"{}\" chunks={} tookMs={}",
                truncate(question, 80), chunks.size(), took);
        return new ChatAnswer(answer.trim(), sources, took);
    }

    private boolean isQuotaError(GeminiCallException e) {
        String msg = e.getMessage();
        if (msg == null) return false;
        return msg.contains("429") || msg.contains("RESOURCE_EXHAUSTED") || msg.contains("quota");
    }

    private String truncate(String s, int n) {
        if (s == null) return "";
        return s.length() <= n ? s : s.substring(0, n) + "...";
    }
}
