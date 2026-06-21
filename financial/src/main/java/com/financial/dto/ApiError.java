package com.financial.dto;

import java.time.OffsetDateTime;
import java.util.List;

public record ApiError(
        OffsetDateTime timestamp,
        int status,
        String code,
        String message,
        List<FieldError> fieldErrors
) {
    public static ApiError of(int status, String code, String message) {
        return new ApiError(OffsetDateTime.now(), status, code, message, List.of());
    }

    public static ApiError withFields(int status, String code, String message, List<FieldError> fieldErrors) {
        return new ApiError(OffsetDateTime.now(), status, code, message, fieldErrors);
    }

    public record FieldError(String field, String message) {}
}
