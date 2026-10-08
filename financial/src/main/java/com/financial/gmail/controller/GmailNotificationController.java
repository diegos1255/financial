package com.financial.gmail.controller;

import com.financial.gmail.dto.UnreadSummaryResponse;
import com.financial.gmail.service.GmailNotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/gmail")
public class GmailNotificationController {

    private final GmailNotificationService service;

    public GmailNotificationController(GmailNotificationService service) {
        this.service = service;
    }

    @GetMapping("/unread-summary")
    public ResponseEntity<UnreadSummaryResponse> unreadSummary() {
        return ResponseEntity.ok(service.getUnreadSummary());
    }
}
