package com.financial.gmail.controller;

import com.financial.gmail.dto.inbox.PagedThreadsResponse;
import com.financial.gmail.dto.inbox.ThreadDetail;
import com.financial.gmail.model.enums.GmailCategory;
import com.financial.gmail.service.GmailInboxService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/gmail")
public class GmailInboxController {

    private final GmailInboxService service;

    public GmailInboxController(GmailInboxService service) {
        this.service = service;
    }

    @GetMapping("/threads")
    public PagedThreadsResponse listThreads(
            @RequestParam(defaultValue = "PRIMARY") GmailCategory category,
            @RequestParam(required = false) String pageToken,
            @RequestParam(defaultValue = "20") int pageSize) {
        return service.listThreads(category, pageToken, pageSize);
    }

    @GetMapping("/threads/{id}")
    public ThreadDetail getThread(@PathVariable("id") String id) {
        return service.getThread(id);
    }

    @PostMapping("/threads/{id}/read")
    public ResponseEntity<Void> markThreadAsRead(@PathVariable("id") String id) {
        service.markThreadAsRead(id);
        return ResponseEntity.noContent().build();
    }
}
