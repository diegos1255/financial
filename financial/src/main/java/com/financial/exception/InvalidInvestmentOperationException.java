package com.financial.exception;

public class InvalidInvestmentOperationException extends RuntimeException {
    public InvalidInvestmentOperationException(String message) {
        super(message);
    }
}
