package com.financial.gmail.dto;

public record UnreadSummaryResponse(
        boolean connected,
        int totalUnread,
        String latestUnreadId,
        String latestUnreadFrom,
        String latestUnreadSubject
) {
    public static UnreadSummaryResponse empty() {
        return new UnreadSummaryResponse(true, 0, null, null, null);
    }

    public static UnreadSummaryResponse notConnected() {
        return new UnreadSummaryResponse(false, 0, null, null, null);
    }
}
