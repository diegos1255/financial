package com.financial.gmail.exception;

public class GmailInvalidStateException extends RuntimeException {
    public GmailInvalidStateException(String message) {
        super(message);
    }
}
