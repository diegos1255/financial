package com.financial.exception;

public class RefreshTokenInvalidException extends RuntimeException {
    public RefreshTokenInvalidException() {
        super("Refresh token inválido ou expirado");
    }
}
