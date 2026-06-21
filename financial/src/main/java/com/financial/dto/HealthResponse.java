package com.financial.dto;

public record HealthResponse(
        String status,
        String service,
        String version,
        String timestamp
) {
}
