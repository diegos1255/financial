package com.financial.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record SalaryResponse(
        UUID id,
        UUID bankAccountId,
        String bankAccountName,
        Integer referenceYear,
        Integer referenceMonth,
        BigDecimal amount,
        String description,
        OffsetDateTime createdDate,
        OffsetDateTime updatedDate
) {}
