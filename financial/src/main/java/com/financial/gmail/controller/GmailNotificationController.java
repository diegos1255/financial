package com.financial.gmail.controller;

import com.financial.gmail.dto.UnreadSummaryResponse;
import com.financial.gmail.repository.GmailCredentialRepository;
import com.financial.gmail.service.GmailNotificationService;
import com.financial.auth.CurrentUser;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/gmail")
public class GmailNotificationController {

    private final GmailNotificationService service;
    private final GmailCredentialRepository credentialRepository;

    public GmailNotificationController(GmailNotificationService service,
                                       GmailCredentialRepository credentialRepository) {
        this.service = service;
        this.credentialRepository = credentialRepository;
    }

    @GetMapping("/unread-summary")
    public ResponseEntity<UnreadSummaryResponse> unreadSummary() {
        if (!credentialRepository.existsByUserId(CurrentUser.id())) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(service.getUnreadSummary());
    }
}
