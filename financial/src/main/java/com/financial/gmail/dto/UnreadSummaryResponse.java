package com.financial.gmail.dto;

public record UnreadSummaryResponse(
        int totalUnread,
        String latestUnreadId,
        String latestUnreadFrom,
        String latestUnreadSubject
) {
    public static UnreadSummaryResponse empty() {
        return new UnreadSummaryResponse(0, null, null, null);
    }
}
