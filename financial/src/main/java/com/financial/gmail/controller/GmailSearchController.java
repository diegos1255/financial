package com.financial.gmail.controller;

import com.financial.gmail.dto.inbox.PagedThreadsResponse;
import com.financial.gmail.service.GmailSearchService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/gmail")
public class GmailSearchController {

    private final GmailSearchService service;

    public GmailSearchController(GmailSearchService service) {
        this.service = service;
    }

    @GetMapping("/search")
    public PagedThreadsResponse search(
            @RequestParam("q") String query,
            @RequestParam(required = false) String pageToken,
            @RequestParam(defaultValue = "20") int pageSize) {
        return service.search(query, pageToken, pageSize);
    }
}
