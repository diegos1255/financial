package com.financial.gmail.controller;

import com.financial.gmail.service.GmailAttachmentsService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/gmail")
public class GmailAttachmentsController {

    private static final int MAX_FILENAME_LENGTH = 255;

    private final GmailAttachmentsService service;

    public GmailAttachmentsController(GmailAttachmentsService service) {
        this.service = service;
    }

    @GetMapping("/messages/{messageId}/attachments/{attachmentId}")
    public void download(
            @PathVariable("messageId") String messageId,
            @PathVariable("attachmentId") String attachmentId,
            @RequestParam("filename") String filename,
            @RequestParam(value = "contentType", required = false) String contentType,
            HttpServletResponse response) throws IOException {
        String safeFilename = sanitizeFilename(filename);
        byte[] bytes = service.download(messageId, attachmentId);

        String type = (contentType != null && !contentType.isBlank()) ? contentType : "application/octet-stream";
        response.setContentType(type);
        response.setContentLength(bytes.length);
        String encoded = URLEncoder.encode(safeFilename, StandardCharsets.UTF_8).replace("+", "%20");
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=\"" + safeFilename + "\"; filename*=UTF-8''" + encoded);
        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
        response.getOutputStream().write(bytes);
        response.getOutputStream().flush();
    }

    private String sanitizeFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "filename obrigatorio");
        }
        if (filename.length() > MAX_FILENAME_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "filename muito longo");
        }
        if (filename.indexOf('\0') >= 0 || filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "filename invalido");
        }
        return filename;
    }
}
