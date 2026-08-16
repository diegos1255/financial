package com.financial.gmail.model.enums;

public enum GmailCategory {
    PRIMARY("CATEGORY_PERSONAL"),
    SOCIAL("CATEGORY_SOCIAL"),
    PROMOTIONS("CATEGORY_PROMOTIONS"),
    UPDATES("CATEGORY_UPDATES");

    private final String gmailLabel;

    GmailCategory(String gmailLabel) {
        this.gmailLabel = gmailLabel;
    }

    public String gmailLabel() {
        return gmailLabel;
    }
}
