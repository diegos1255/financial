package com.financial.gmail.dto;

public record GmailStatusResponse(
        boolean connected,
        String emailAddress
) {
    public static GmailStatusResponse notConnected() {
        return new GmailStatusResponse(false, null);
    }

    public static GmailStatusResponse connected(String emailAddress) {
        return new GmailStatusResponse(true, emailAddress);
    }
}
