package com.financial.gmail.service;

import com.financial.auth.CurrentUser;
import com.financial.gmail.api.GmailApiClient;
import com.financial.gmail.dto.labels.LabelSummary;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Servico de labels do Gmail. Cache in-memory 5min por usuario pra reduzir
 * chamadas repetidas ao listar (labels mudam raramente).
 */
@Service
public class GmailLabelsService {

    private static final Duration CACHE_TTL = Duration.ofMinutes(5);

    private final GmailApiClient api;
    private final Map<UUID, CacheEntry> cache = new ConcurrentHashMap<>();

    public GmailLabelsService(GmailApiClient api) {
        this.api = api;
    }

    public List<LabelSummary> list(boolean includeStats) {
        UUID userId = CurrentUser.id();
        CacheEntry entry = cache.get(userId);
        Instant now = Instant.now();
        if (!includeStats && entry != null && entry.expiresAt.isAfter(now)) {
            return entry.value;
        }
        List<LabelSummary> fresh = fetchLabels(includeStats);
        if (!includeStats) {
            cache.put(userId, new CacheEntry(fresh, now.plus(CACHE_TTL)));
        }
        return fresh;
    }

    public LabelSummary create(String name) {
        Map<String, Object> raw = api.createLabel(name);
        invalidateCache();
        return toSummary(raw);
    }

    public LabelSummary rename(String labelId, String newName) {
        Map<String, Object> raw = api.patchLabel(labelId, newName);
        invalidateCache();
        return toSummary(raw);
    }

    public void delete(String labelId) {
        api.deleteLabel(labelId);
        invalidateCache();
    }

    public void modifyThreadLabels(String threadId, List<String> add, List<String> remove) {
        api.modifyThread(threadId, add, remove);
    }

    private void invalidateCache() {
        cache.remove(CurrentUser.id());
    }

    private List<LabelSummary> fetchLabels(boolean includeStats) {
        Map<String, Object> resp = api.listLabels();
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> raw = (List<Map<String, Object>>) resp.get("labels");
        if (raw == null) return List.of();

        List<LabelSummary> out = new ArrayList<>(raw.size());
        for (Map<String, Object> item : raw) {
            if (includeStats) {
                String id = (String) item.get("id");
                try {
                    Map<String, Object> full = api.getLabel(id);
                    out.add(toSummary(full));
                } catch (RuntimeException e) {
                    out.add(toSummary(item));
                }
            } else {
                out.add(toSummary(item));
            }
        }
        return out;
    }

    private LabelSummary toSummary(Map<String, Object> raw) {
        return new LabelSummary(
                (String) raw.get("id"),
                (String) raw.get("name"),
                (String) raw.get("type"),
                toInt(raw.get("messagesUnread")),
                toInt(raw.get("messagesTotal"))
        );
    }

    private Integer toInt(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.intValue();
        try { return Integer.parseInt(o.toString()); }
        catch (NumberFormatException e) { return null; }
    }

    private record CacheEntry(List<LabelSummary> value, Instant expiresAt) {}
}
