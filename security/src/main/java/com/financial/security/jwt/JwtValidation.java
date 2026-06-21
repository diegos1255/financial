package com.financial.security.jwt;

public record JwtValidation(Status status, String subject) {

    public enum Status { VALID, EXPIRED, INVALID }

    public static JwtValidation valid(String subject) {
        return new JwtValidation(Status.VALID, subject);
    }

    public static JwtValidation expired() {
        return new JwtValidation(Status.EXPIRED, null);
    }

    public static JwtValidation invalid() {
        return new JwtValidation(Status.INVALID, null);
    }

    public boolean isValid() {
        return status == Status.VALID;
    }

    public boolean isExpired() {
        return status == Status.EXPIRED;
    }
}
