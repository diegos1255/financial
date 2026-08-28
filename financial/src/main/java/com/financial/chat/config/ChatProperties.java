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
    private Query query = new Query();

    public boolean isEnabled() {
        return gemini.apiKey != null && !gemini.apiKey.isBlank();
    }

    public Gemini getGemini() { return gemini; }
    public void setGemini(Gemini gemini) { this.gemini = gemini; }

    public Rag getRag() { return rag; }
    public void setRag(Rag rag) { this.rag = rag; }

    public Query getQuery() { return query; }
    public void setQuery(Query query) { this.query = query; }

    public static class Gemini {
        private String apiKey;
        private String baseUrl = "https://generativelanguage.googleapis.com/v1beta";
        // gemini-embedding-001: modelo GA atual. Default eh 3072 dims, mas
        // aceita outputDimensionality pra reduzir. Usamos 768 pra bater com a
        // coluna vector(768) da tabela chat_document_chunks.
        private String embeddingModel = "gemini-embedding-001";
        private int embeddingDimensions = 768;
        // gemini-3.5-flash: nao lite. Lite era fraco em seguir instrucoes complexas
        // e copiava texto tecnico das specs sem traduzir pra "instrucoes de UI".
        // Flash regular tem raciocinio suficiente pra transformar contexto tecnico
        // em resposta amigavel de usuario.
        private String chatModel = "gemini-3.5-flash";

        public int getEmbeddingDimensions() { return embeddingDimensions; }
        public void setEmbeddingDimensions(int embeddingDimensions) { this.embeddingDimensions = embeddingDimensions; }

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
        private String corpusPath = "/app/docs";
        private java.util.List<String> corpusWhitelist = java.util.List.of(
                "specs/", "02-development-plan.md", "01-database-modeling.md");
        private long throttleMs = 150;

        public int getTopK() { return topK; }
        public void setTopK(int topK) { this.topK = topK; }

        public double getMinScore() { return minScore; }
        public void setMinScore(double minScore) { this.minScore = minScore; }

        public int getChunkMaxTokens() { return chunkMaxTokens; }
        public void setChunkMaxTokens(int chunkMaxTokens) { this.chunkMaxTokens = chunkMaxTokens; }

        public String getCorpusPath() { return corpusPath; }
        public void setCorpusPath(String corpusPath) { this.corpusPath = corpusPath; }

        public java.util.List<String> getCorpusWhitelist() { return corpusWhitelist; }
        public void setCorpusWhitelist(java.util.List<String> corpusWhitelist) { this.corpusWhitelist = corpusWhitelist; }

        public long getThrottleMs() { return throttleMs; }
        public void setThrottleMs(long throttleMs) { this.throttleMs = throttleMs; }
    }

    public static class Query {
        private int rateLimitPerHour = 20;
        private double temperature = 0.2;
        private int maxOutputTokens = 1024;

        public int getRateLimitPerHour() { return rateLimitPerHour; }
        public void setRateLimitPerHour(int rateLimitPerHour) { this.rateLimitPerHour = rateLimitPerHour; }

        public double getTemperature() { return temperature; }
        public void setTemperature(double temperature) { this.temperature = temperature; }

        public int getMaxOutputTokens() { return maxOutputTokens; }
        public void setMaxOutputTokens(int maxOutputTokens) { this.maxOutputTokens = maxOutputTokens; }
    }
}
