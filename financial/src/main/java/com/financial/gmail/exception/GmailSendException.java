package com.financial.gmail.exception;

public class GmailSendException extends RuntimeException {
    public GmailSendException(String message, Throwable cause) {
        super(message, cause);
    }
}
