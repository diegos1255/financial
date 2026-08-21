package com.financial.gmail.service;

import com.financial.gmail.api.GmailApiClient;
import com.financial.gmail.dto.send.SendMessageRequest;
import com.financial.gmail.dto.send.SendMessageResponse;
import com.financial.gmail.exception.GmailSendException;
import com.financial.gmail.util.MimeMessageBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.List;
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

    private static final long MAX_ATTACHMENTS_TOTAL_BYTES = 25L * 1024 * 1024;

    public SendMessageResponse send(SendMessageRequest request) {
        return send(request, null);
    }

    public SendMessageResponse send(SendMessageRequest request, List<MultipartFile> files) {
        if (files != null && !files.isEmpty()) {
            long total = 0;
            for (MultipartFile f : files) {
                if (f == null || f.isEmpty()) continue;
                total += f.getSize();
            }
            if (total > MAX_ATTACHMENTS_TOTAL_BYTES) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Anexos excedem 25MB (limite do Gmail)");
            }
        }
        String from = authService.getConnectedEmailAddress();
        String raw = mimeBuilder.buildRawMessage(from, request, files);
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
