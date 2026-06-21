package com.financial.exception;

public class InstallmentAlreadyProcessedException extends RuntimeException {
    public InstallmentAlreadyProcessedException(String message) {
        super(message);
    }
}
