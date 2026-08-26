package com.financial.chat.service;

import com.financial.chat.client.GeminiChatClient;
import com.financial.chat.client.GeminiEmbeddingClient;
import com.financial.chat.dto.ChatAnswer;
import com.financial.chat.dto.ChunkSource;
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
        float[] queryEmbedding = embeddingClient.embed(question);
        List<RetrievedChunk> chunks = retrieval.topK(queryEmbedding);

        if (chunks.isEmpty()) {
            long took = System.currentTimeMillis() - started;
            log.warn("Chat: sem chunks acima do minScore. question=\"{}\" tookMs={}",
                    truncate(question, 80), took);
            return new ChatAnswer(NO_CONTEXT_ANSWER, List.of(), took);
        }

        String prompt = promptBuilder.build(question, chunks);
        String answer = chatClient.generate(prompt);
        long took = System.currentTimeMillis() - started;

        List<ChunkSource> sources = chunks.stream()
                .map(c -> new ChunkSource(c.sourcePath(), c.section(), c.score()))
                .toList();

        log.info("Chat: question=\"{}\" chunks={} tookMs={}",
                truncate(question, 80), chunks.size(), took);
        return new ChatAnswer(answer.trim(), sources, took);
    }

    private String truncate(String s, int n) {
        if (s == null) return "";
        return s.length() <= n ? s : s.substring(0, n) + "...";
    }
}
