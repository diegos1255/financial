package com.financial.exception;

public class PaymentDateInFutureException extends RuntimeException {
    public PaymentDateInFutureException(String message) {
        super(message);
    }
}
