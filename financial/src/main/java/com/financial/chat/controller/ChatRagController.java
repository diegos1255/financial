package com.financial.chat.controller;

import com.financial.chat.config.ChatProperties;
import com.financial.chat.dto.ReindexResult;
import com.financial.chat.service.RagIngestionService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/chat")
public class ChatRagController {

    private final RagIngestionService ingestionService;
    private final ChatProperties props;

    public ChatRagController(RagIngestionService ingestionService, ChatProperties props) {
        this.ingestionService = ingestionService;
        this.props = props;
    }

    @PostMapping("/rag/reindex")
    public ReindexResult reindex() {
        if (!props.isEnabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Chat desabilitado — configure GEMINI_API_KEY");
        }
        try {
            return ingestionService.reindex();
        } catch (IllegalStateException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage());
        }
    }
}
