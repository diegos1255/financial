package com.financial.exception;

public class LoginAlreadyExistsException extends RuntimeException {
    public LoginAlreadyExistsException(String login) {
        super("Login já em uso: " + login);
    }
}
