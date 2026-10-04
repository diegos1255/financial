package com.financial.exception;

public class SalaryPaymentOutOfCompetenceException extends RuntimeException {
    public SalaryPaymentOutOfCompetenceException(String message) {
        super(message);
    }
}
