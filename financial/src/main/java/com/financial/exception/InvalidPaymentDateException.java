package com.financial.exception;

public class InvalidPaymentDateException extends RuntimeException {
    public InvalidPaymentDateException(String message) {
        super(message);
    }
}
