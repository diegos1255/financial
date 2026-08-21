package com.financial.tts.service;

import com.financial.tts.config.TtsProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Service
public class TtsService {

    private static final Logger log = LoggerFactory.getLogger(TtsService.class);

    private final TtsProperties properties;
    private final RestClient http = RestClient.create();

    public TtsService(TtsProperties properties) {
        this.properties = properties;
    }

    public boolean isEnabled() {
        return properties.isConfigured();
    }

    /**
     * Sintetiza `text` em audio/mpeg via ElevenLabs.
     * Retorna null se não configurado ou se a chamada falhar (front cai para fallback local).
     */
    public byte[] synthesize(String text) {
        if (!isEnabled()) return null;
        if (text == null || text.isBlank()) return null;

        try {
            String uri = properties.getEndpoint() + "/" + properties.getVoiceId();
            Map<String, Object> body = Map.of(
                    "text", text,
                    "model_id", properties.getModelId(),
                    "voice_settings", Map.of(
                            "stability", 0.5,
                            "similarity_boost", 0.75
                    )
            );

            return http.post()
                    .uri(uri)
                    .header("xi-api-key", properties.getApiKey())
                    .header("Accept", "audio/mpeg")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(byte[].class);
        } catch (Exception e) {
            log.warn("ElevenLabs TTS falhou: {}", e.toString());
            return null;
        }
    }
}
