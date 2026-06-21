package com.financial.exception;

public class InvalidPhotoException extends RuntimeException {
    public InvalidPhotoException(String message) {
        super(message);
    }
}
