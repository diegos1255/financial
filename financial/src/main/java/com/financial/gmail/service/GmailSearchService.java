package com.financial.gmail.service;

import com.financial.gmail.dto.inbox.PagedThreadsResponse;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

/**
 * Servico de busca de emails com query passthrough ao Gmail.
 * Aceita todos os operadores nativos do Gmail (from:, subject:, has:attachment, after:, etc.)
 * e texto livre.
 */
@Service
public class GmailSearchService {

    private static final int MAX_QUERY_LENGTH = 500;

    private final GmailInboxService inboxService;

    public GmailSearchService(GmailInboxService inboxService) {
        this.inboxService = inboxService;
    }

    public PagedThreadsResponse search(String query, String pageToken, int pageSize) {
        String sanitized = sanitize(query);
        return inboxService.searchThreads(sanitized, pageToken, pageSize);
    }

    private String sanitize(String query) {
        if (query == null || query.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Query nao pode ser vazia");
        }
        if (query.length() > MAX_QUERY_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Query maior que " + MAX_QUERY_LENGTH + " caracteres");
        }
        if (query.indexOf('\0') >= 0 || query.indexOf('\r') >= 0 || query.indexOf('\n') >= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Query contem caracteres invalidos");
        }
        return query.trim();
    }
}
