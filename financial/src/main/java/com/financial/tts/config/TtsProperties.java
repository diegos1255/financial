package com.financial.tts.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "tts.elevenlabs")
public class TtsProperties {

    private String apiKey;
    private String voiceId;
    private String modelId = "eleven_multilingual_v2";
    private String endpoint = "https://api.elevenlabs.io/v1/text-to-speech";

    public String getApiKey() { return apiKey; }
    public void setApiKey(String apiKey) { this.apiKey = apiKey; }

    public String getVoiceId() { return voiceId; }
    public void setVoiceId(String voiceId) { this.voiceId = voiceId; }

    public String getModelId() { return modelId; }
    public void setModelId(String modelId) { this.modelId = modelId; }

    public String getEndpoint() { return endpoint; }
    public void setEndpoint(String endpoint) { this.endpoint = endpoint; }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank()
                && voiceId != null && !voiceId.isBlank();
    }
}
