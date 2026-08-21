package com.financial.gmail.controller;

import com.financial.gmail.dto.send.SendMessageRequest;
import com.financial.gmail.dto.send.SendMessageResponse;
import com.financial.gmail.service.GmailSendService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/gmail")
public class GmailSendController {

    private final GmailSendService service;

    public GmailSendController(GmailSendService service) {
        this.service = service;
    }

    @PostMapping("/messages/send")
    public SendMessageResponse send(@Valid @RequestBody SendMessageRequest request) {
        return service.send(request);
    }
}
