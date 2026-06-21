package com.financial.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record BankAccountResponse(
        UUID id,
        String name,
        String description,
        Boolean active,
        OffsetDateTime createdDate,
        OffsetDateTime updatedDate
) {}
