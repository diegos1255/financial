package com.financial.gmail.exception;

public class GmailReauthRequiredException extends RuntimeException {
    public GmailReauthRequiredException(String message) {
        super(message);
    }
}
