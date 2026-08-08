package com.financial.dto;

import com.financial.model.enums.PjEntryType;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record PjEntryResponse(
        UUID id,
        PjEntryType type,
        Integer year,
        Integer month,
        BigDecimal amount,
        String fileName,
        String contentType,
        OffsetDateTime createdDate,
        OffsetDateTime updatedDate
) {}
