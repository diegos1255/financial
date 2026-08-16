package com.financial.gmail.dto.inbox;

import java.time.OffsetDateTime;
import java.util.List;

public record MessageDetail(
        String id,
        String from,
        List<String> to,
        List<String> cc,
        OffsetDateTime date,
        String bodyHtml,
        List<String> labelIds,
        boolean unread
) {}
