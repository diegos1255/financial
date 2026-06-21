package com.financial.exception;

public class ExpenseCancellationException extends RuntimeException {
    public ExpenseCancellationException(String message) {
        super(message);
    }
}
