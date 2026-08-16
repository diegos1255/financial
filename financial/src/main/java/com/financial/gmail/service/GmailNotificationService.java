package com.financial.gmail.service;

import com.financial.auth.CurrentUser;
import com.financial.gmail.api.GmailApiClient;
import com.financial.gmail.dto.UnreadSummaryResponse;
import com.financial.gmail.util.MessageParser;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Prove resumo dos emails nao lidos pro polling de badge + toast do frontend.
 * Cache in-memory de 30s por usuario pra evitar estourar quota da Gmail API
 * (polling frontend tambem e de 30s, entao worst case = 1 chamada/min por user).
 */
@Service
public class GmailNotificationService {

    private static final Duration CACHE_TTL = Duration.ofSeconds(30);
    private static final List<String> UNREAD_LABEL = List.of("UNREAD", "INBOX");
    private static final List<String> SUMMARY_HEADERS = List.of("From", "Subject");

    private final GmailApiClient api;
    private final MessageParser parser;
    private final Map<UUID, CacheEntry> cache = new ConcurrentHashMap<>();

    public GmailNotificationService(GmailApiClient api, MessageParser parser) {
        this.api = api;
        this.parser = parser;
    }

    public UnreadSummaryResponse getUnreadSummary() {
        UUID userId = CurrentUser.id();
        CacheEntry entry = cache.get(userId);
        Instant now = Instant.now();
        if (entry != null && entry.expiresAt.isAfter(now)) {
            return entry.value;
        }

        UnreadSummaryResponse fresh = fetchFromGmail();
        cache.put(userId, new CacheEntry(fresh, now.plus(CACHE_TTL)));
        return fresh;
    }

    public void invalidate() {
        cache.remove(CurrentUser.id());
    }

    private UnreadSummaryResponse fetchFromGmail() {
        // Contagem EXATA via labels.get(INBOX). O resultSizeEstimate de messages.list e
        // sabidamente impreciso (a doc do Gmail admite: "estimated total").
        int total = fetchInboxUnreadCount();
        if (total == 0) {
            return UnreadSummaryResponse.empty();
        }

        // Pra latestUnread* precisamos do id + headers da msg mais recente nao-lida
        Map<String, Object> resp = api.listMessages(null, UNREAD_LABEL, 1, null);
        String latestId = extractFirstMessageId(resp);
        if (latestId == null) {
            return new UnreadSummaryResponse(total, null, null, null);
        }

        try {
            Map<String, Object> msg = api.getMessage(latestId, "metadata", SUMMARY_HEADERS);
            @SuppressWarnings("unchecked")
            Map<String, Object> payload = (Map<String, Object>) msg.get("payload");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> headers = payload != null
                    ? (List<Map<String, Object>>) payload.get("headers")
                    : List.of();
            String from = parser.extractHeader(headers, "From");
            String subject = parser.extractHeader(headers, "Subject");
            return new UnreadSummaryResponse(total, latestId, from, subject);
        } catch (RuntimeException e) {
            return new UnreadSummaryResponse(total, latestId, null, null);
        }
    }

    private int fetchInboxUnreadCount() {
        try {
            Map<String, Object> label = api.getLabel("INBOX");
            Object unread = label.get("messagesUnread");
            if (unread instanceof Number n) return n.intValue();
            return Integer.parseInt(String.valueOf(unread));
        } catch (RuntimeException e) {
            return 0;
        }
    }

    @SuppressWarnings("unchecked")
    private String extractFirstMessageId(Map<String, Object> listResponse) {
        List<Map<String, Object>> messages = (List<Map<String, Object>>) listResponse.get("messages");
        if (messages == null || messages.isEmpty()) return null;
        Object id = messages.get(0).get("id");
        return id != null ? id.toString() : null;
    }

    private record CacheEntry(UnreadSummaryResponse value, Instant expiresAt) {}
}
