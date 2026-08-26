package com.financial.chat.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Config do modulo chat/RAG. Bloco `chat.*` no application.yml.
 * Se {@code gemini.apiKey} nao esta setado, o chat esta desabilitado
 * (endpoints retornam 503, widget frontend nao aparece).
 */
@ConfigurationProperties(prefix = "chat")
public class ChatProperties {

    private Gemini gemini = new Gemini();
    private Rag rag = new Rag();

    public boolean isEnabled() {
        return gemini.apiKey != null && !gemini.apiKey.isBlank();
    }

    public Gemini getGemini() { return gemini; }
    public void setGemini(Gemini gemini) { this.gemini = gemini; }

    public Rag getRag() { return rag; }
    public void setRag(Rag rag) { this.rag = rag; }

    public static class Gemini {
        private String apiKey;
        private String baseUrl = "https://generativelanguage.googleapis.com/v1beta";
        private String embeddingModel = "text-embedding-004";
        private String chatModel = "gemini-1.5-flash";

        public String getApiKey() { return apiKey; }
        public void setApiKey(String apiKey) { this.apiKey = apiKey; }

        public String getBaseUrl() { return baseUrl; }
        public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }

        public String getEmbeddingModel() { return embeddingModel; }
        public void setEmbeddingModel(String embeddingModel) { this.embeddingModel = embeddingModel; }

        public String getChatModel() { return chatModel; }
        public void setChatModel(String chatModel) { this.chatModel = chatModel; }
    }

    public static class Rag {
        private int topK = 5;
        private double minScore = 0.55;
        private int chunkMaxTokens = 800;

        public int getTopK() { return topK; }
        public void setTopK(int topK) { this.topK = topK; }

        public double getMinScore() { return minScore; }
        public void setMinScore(double minScore) { this.minScore = minScore; }

        public int getChunkMaxTokens() { return chunkMaxTokens; }
        public void setChunkMaxTokens(int chunkMaxTokens) { this.chunkMaxTokens = chunkMaxTokens; }
    }
}
