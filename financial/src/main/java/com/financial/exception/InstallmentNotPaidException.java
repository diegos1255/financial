package com.financial.exception;

public class InstallmentNotPaidException extends RuntimeException {
    public InstallmentNotPaidException(String message) {
        super(message);
    }
}
