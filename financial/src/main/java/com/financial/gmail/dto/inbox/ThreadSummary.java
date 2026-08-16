package com.financial.gmail.dto.inbox;

import java.time.OffsetDateTime;

public record ThreadSummary(
        String id,
        String snippet,
        String from,
        String subject,
        OffsetDateTime date,
        boolean unread,
        int messageCount
) {}
