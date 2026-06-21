package com.financial.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record InvestmentResponse(
        UUID id,
        String ticker,
        Integer quantity,
        String description,
        Boolean active,
        OffsetDateTime createdDate,
        OffsetDateTime updatedDate
) {}
