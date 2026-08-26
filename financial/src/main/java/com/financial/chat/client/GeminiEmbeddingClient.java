package com.financial.chat.client;

import com.financial.chat.config.ChatProperties;
import com.financial.chat.exception.GeminiCallException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

/**
 * Cliente HTTP para o endpoint {@code :embedContent} do Gemini.
 * <p>
 * Retry simples: 1 tentativa extra em 429/5xx com backoff de 1s. Falha final
 * relanca como {@link GeminiCallException}.
 */
@Component
public class GeminiEmbeddingClient {

    private static final Logger log = LoggerFactory.getLogger(GeminiEmbeddingClient.class);

    private final ChatProperties props;
    private final RestClient http = RestClient.create();

    public GeminiEmbeddingClient(ChatProperties props) {
        this.props = props;
    }

    public float[] embed(String text) {
        if (text == null || text.isBlank()) {
            throw new IllegalArgumentException("texto vazio pra embed");
        }
        String uri = props.getGemini().getBaseUrl()
                + "/models/" + props.getGemini().getEmbeddingModel()
                + ":embedContent?key=" + props.getGemini().getApiKey();
        Map<String, Object> body = Map.of(
                "content", Map.of("parts", List.of(Map.of("text", text))),
                // SEMANTIC_SIMILARITY: recomendado pra RAG retrieval
                "taskType", "SEMANTIC_SIMILARITY",
                // Reduz o embedding de 3072 (default) pra 768 (nossa coluna vector)
                "outputDimensionality", props.getGemini().getEmbeddingDimensions()
        );

        // Retry com backoff exponencial em 429/5xx. Ate 3 tentativas.
        int maxAttempts = 3;
        long backoffMs = 2000;
        HttpStatusCode lastStatus = null;
        Exception lastError = null;
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return callOnce(uri, body);
            } catch (HttpClientErrorException | HttpServerErrorException e) {
                lastStatus = e.getStatusCode();
                lastError = e;
                boolean retriable = lastStatus.value() == 429 || lastStatus.is5xxServerError();
                if (!retriable || attempt == maxAttempts) break;
                log.warn("Gemini embed retornou {} (tentativa {}/{}); aguardando {}ms",
                        lastStatus.value(), attempt, maxAttempts, backoffMs);
                sleepQuietly(backoffMs);
                backoffMs *= 2;
            } catch (Exception e) {
                throw new GeminiCallException("Gemini embed falhou: " + e.getMessage(), e);
            }
        }
        throw new GeminiCallException(
                "Gemini embed falhou apos " + maxAttempts + " tentativas: "
                        + (lastError != null ? lastError.getMessage() : "unknown"),
                lastError);
    }

    @SuppressWarnings("unchecked")
    private float[] callOnce(String uri, Map<String, Object> body) {
        Map<String, Object> resp = http.post()
                .uri(uri)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(new ParameterizedTypeReference<Map<String, Object>>() {});
        if (resp == null || !(resp.get("embedding") instanceof Map<?, ?> embedding)) {
            throw new GeminiCallException("resposta sem embedding");
        }
        Object values = ((Map<String, Object>) embedding).get("values");
        if (!(values instanceof List<?> vals) || vals.isEmpty()) {
            throw new GeminiCallException("embedding.values vazio");
        }
        float[] out = new float[vals.size()];
        for (int i = 0; i < vals.size(); i++) {
            out[i] = ((Number) vals.get(i)).floatValue();
        }
        return out;
    }

    private void sleepQuietly(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }
}
