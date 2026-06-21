package com.financial.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ExpenseCategoryResponse(
        UUID id,
        String name,
        String description,
        String color,
        Boolean active,
        OffsetDateTime createdDate,
        OffsetDateTime updatedDate
) {}
