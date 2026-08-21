package com.financial.gmail.service;

import com.financial.gmail.api.GmailApiClient;
import org.springframework.stereotype.Service;

import java.util.Base64;
import java.util.Map;

@Service
public class GmailAttachmentsService {

    private final GmailApiClient api;

    public GmailAttachmentsService(GmailApiClient api) {
        this.api = api;
    }

    public byte[] download(String messageId, String attachmentId) {
        Map<String, Object> resp = api.getAttachment(messageId, attachmentId);
        Object data = resp.get("data");
        if (data == null) {
            throw new IllegalStateException("Gmail nao retornou data no anexo");
        }
        return Base64.getUrlDecoder().decode(data.toString());
    }
}
