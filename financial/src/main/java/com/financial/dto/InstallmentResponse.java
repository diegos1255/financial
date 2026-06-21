package com.financial.dto;

import com.financial.model.enums.InstallmentStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record InstallmentResponse(
        UUID id,
        Integer installmentNumber,
        LocalDate dueDate,
        BigDecimal amount,
        InstallmentStatus status,
        OffsetDateTime paidAt
) {}
