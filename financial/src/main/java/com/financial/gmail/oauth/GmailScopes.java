package com.financial.gmail.oauth;

import java.util.List;

public final class GmailScopes {

    private GmailScopes() {}

    public static final String OPENID = "openid";
    public static final String EMAIL = "https://www.googleapis.com/auth/userinfo.email";
    public static final String GMAIL_MODIFY = "https://www.googleapis.com/auth/gmail.modify";
    public static final String GMAIL_SEND = "https://www.googleapis.com/auth/gmail.send";
    public static final String GMAIL_LABELS = "https://www.googleapis.com/auth/gmail.labels";

    public static final List<String> ALL = List.of(
            OPENID,
            EMAIL,
            GMAIL_MODIFY,
            GMAIL_SEND,
            GMAIL_LABELS
    );

    public static String asSpaceSeparated() {
        return String.join(" ", ALL);
    }
}
