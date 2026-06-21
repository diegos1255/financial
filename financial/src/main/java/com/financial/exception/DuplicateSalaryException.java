package com.financial.exception;

public class DuplicateSalaryException extends RuntimeException {
    public DuplicateSalaryException(String message) {
        super(message);
    }
}
