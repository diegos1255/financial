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
 * Cliente HTTP para o endpoint {@code :generateContent} do Gemini. Envia
 * o prompt completo e devolve so o texto da resposta.
 */
@Component
public class GeminiChatClient {

    private static final Logger log = LoggerFactory.getLogger(GeminiChatClient.class);

    private final ChatProperties props;
    private final RestClient http = RestClient.create();

    public GeminiChatClient(ChatProperties props) {
        this.props = props;
    }

    public String generate(String prompt) {
        String uri = props.getGemini().getBaseUrl()
                + "/models/" + props.getGemini().getChatModel()
                + ":generateContent?key=" + props.getGemini().getApiKey();
        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of(
                        "parts", List.of(Map.of("text", prompt))
                )),
                "generationConfig", Map.of(
                        "temperature", props.getQuery().getTemperature(),
                        "topP", 0.9,
                        "maxOutputTokens", props.getQuery().getMaxOutputTokens()
                )
        );

        // Modelos Flash as vezes retornam 503 "high demand" — 4 tentativas com
        // backoff exponencial (2s, 4s, 8s, 16s) da margem pra a fila esvaziar.
        int maxAttempts = 4;
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
                log.warn("Gemini chat retornou {} (tentativa {}/{}); aguardando {}ms",
                        lastStatus.value(), attempt, maxAttempts, backoffMs);
                sleepQuietly(backoffMs);
                backoffMs *= 2;
            } catch (Exception e) {
                throw new GeminiCallException("Gemini chat falhou: " + e.getMessage(), e);
            }
        }
        throw new GeminiCallException(
                "Gemini chat falhou apos " + maxAttempts + " tentativas: "
                        + (lastError != null ? lastError.getMessage() : "unknown"),
                lastError);
    }

    @SuppressWarnings("unchecked")
    private String callOnce(String uri, Map<String, Object> body) {
        Map<String, Object> resp = http.post()
                .uri(uri)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(new ParameterizedTypeReference<Map<String, Object>>() {});
        if (resp == null) throw new GeminiCallException("resposta vazia");
        List<Map<String, Object>> candidates = (List<Map<String, Object>>) resp.get("candidates");
        if (candidates == null || candidates.isEmpty()) {
            throw new GeminiCallException("sem candidates na resposta");
        }
        Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
        if (content == null) throw new GeminiCallException("candidate sem content");
        List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
        if (parts == null || parts.isEmpty()) throw new GeminiCallException("content sem parts");
        Object text = parts.get(0).get("text");
        if (text == null) throw new GeminiCallException("parts sem text");
        return text.toString();
    }

    private void sleepQuietly(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }
}
