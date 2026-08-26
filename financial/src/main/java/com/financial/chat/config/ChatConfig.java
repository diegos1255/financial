package com.financial.chat.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import jakarta.annotation.PostConstruct;

@Configuration
@EnableConfigurationProperties(ChatProperties.class)
public class ChatConfig {

    private static final Logger log = LoggerFactory.getLogger(ChatConfig.class);

    private final ChatProperties props;

    public ChatConfig(ChatProperties props) {
        this.props = props;
    }

    @PostConstruct
    void logStatus() {
        if (props.isEnabled()) {
            log.info("Chat/RAG habilitado: model={} embedding={}",
                    props.getGemini().getChatModel(), props.getGemini().getEmbeddingModel());
        } else {
            log.warn("Chat/RAG desabilitado — GEMINI_API_KEY nao configurada. Endpoints /api/chat retornarao 503.");
        }
    }
}
