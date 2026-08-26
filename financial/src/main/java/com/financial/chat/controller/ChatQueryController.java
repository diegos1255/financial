package com.financial.chat.controller;

import com.financial.auth.CurrentUser;
import com.financial.chat.config.ChatProperties;
import com.financial.chat.dto.ChatAnswer;
import com.financial.chat.dto.ChatQueryRequest;
import com.financial.chat.service.ChatQueryService;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/chat")
public class ChatQueryController {

    private final ChatQueryService service;
    private final ChatProperties props;
    private final Map<UUID, Bucket> buckets = new ConcurrentHashMap<>();

    public ChatQueryController(ChatQueryService service, ChatProperties props) {
        this.service = service;
        this.props = props;
    }

    @GetMapping("/status")
    public Map<String, Boolean> status() {
        return Map.of("enabled", props.isEnabled());
    }

    @PostMapping("/query")
    public ChatAnswer query(@Valid @RequestBody ChatQueryRequest request) {
        if (!props.isEnabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Chat desabilitado — configure GEMINI_API_KEY");
        }
        String question = sanitize(request.question());

        UUID userId = CurrentUser.id();
        Bucket bucket = buckets.computeIfAbsent(userId, k -> createBucket());
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (!probe.isConsumed()) {
            long retryAfter = Math.max(1L, probe.getNanosToWaitForRefill() / 1_000_000_000L);
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Limite de " + props.getQuery().getRateLimitPerHour()
                            + " perguntas por hora atingido. Tente em " + retryAfter + "s.");
        }

        return service.answer(question);
    }

    private String sanitize(String q) {
        if (q == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "pergunta obrigatoria");
        String trimmed = q.trim();
        if (trimmed.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "pergunta vazia");
        if (trimmed.length() > 500) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "pergunta > 500 chars");
        if (trimmed.indexOf('\0') >= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "caracteres invalidos");
        }
        return trimmed;
    }

    private Bucket createBucket() {
        Bandwidth limit = Bandwidth.builder()
                .capacity(props.getQuery().getRateLimitPerHour())
                .refillIntervally(props.getQuery().getRateLimitPerHour(), Duration.ofHours(1))
                .build();
        return Bucket.builder().addLimit(limit).build();
    }
}
