package com.financial.gmail.service;

import com.financial.gmail.api.GmailApiClient;
import com.financial.gmail.dto.send.SendMessageRequest;
import com.financial.gmail.dto.send.SendMessageResponse;
import com.financial.gmail.exception.GmailSendException;
import com.financial.gmail.util.MimeMessageBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class GmailSendService {

    private static final Logger log = LoggerFactory.getLogger(GmailSendService.class);

    private final GmailApiClient api;
    private final GmailAuthService authService;
    private final MimeMessageBuilder mimeBuilder;

    public GmailSendService(GmailApiClient api,
                            GmailAuthService authService,
                            MimeMessageBuilder mimeBuilder) {
        this.api = api;
        this.authService = authService;
        this.mimeBuilder = mimeBuilder;
    }

    public SendMessageResponse send(SendMessageRequest request) {
        String from = authService.getConnectedEmailAddress();
        String raw = mimeBuilder.buildRawMessage(from, request);
        try {
            Map<String, Object> result = api.sendMessage(raw);
            String messageId = (String) result.get("id");
            String threadId = (String) result.get("threadId");
            return new SendMessageResponse(messageId, threadId);
        } catch (RuntimeException e) {
            log.warn("Falha ao enviar email via Gmail: {}", e.toString());
            throw new GmailSendException("Falha ao enviar email pelo Gmail", e);
        }
    }
}
