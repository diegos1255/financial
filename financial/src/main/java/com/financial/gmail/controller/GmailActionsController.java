package com.financial.gmail.controller;

import com.financial.gmail.dto.actions.BulkActionRequest;
import com.financial.gmail.dto.actions.BulkActionResponse;
import com.financial.gmail.service.GmailActionsService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/gmail/threads")
public class GmailActionsController {

    private final GmailActionsService service;

    public GmailActionsController(GmailActionsService service) {
        this.service = service;
    }

    @PostMapping("/{id}/archive")
    public ResponseEntity<Void> archive(@PathVariable("id") String id) {
        service.archive(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/trash")
    public ResponseEntity<Void> trash(@PathVariable("id") String id) {
        service.trash(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/unread")
    public ResponseEntity<Void> unread(@PathVariable("id") String id) {
        service.markAsUnread(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/bulk")
    public BulkActionResponse bulk(@Valid @RequestBody BulkActionRequest request) {
        return service.bulkExecute(request);
    }
}
