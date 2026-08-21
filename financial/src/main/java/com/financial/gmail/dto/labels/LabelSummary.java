package com.financial.gmail.dto.labels;

public record LabelSummary(
        String id,
        String name,
        String type,           // "system" | "user"
        Integer messagesUnread,
        Integer messagesTotal
) {}
