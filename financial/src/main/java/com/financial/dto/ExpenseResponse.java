package com.financial.dto;

import com.financial.model.enums.ExpenseStatus;
import com.financial.model.enums.ExpenseType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record ExpenseResponse(
        UUID id,
        String description,
        BigDecimal totalAmount,
        ExpenseType expenseType,
        ExpenseStatus status,
        LocalDate purchaseDate,
        LocalDate firstDueDate,
        Integer installmentsCount,
        OffsetDateTime cancelledAt,
        RefDto category,
        RefDto bankAccount,
        List<InstallmentResponse> installments,
        OffsetDateTime createdDate,
        OffsetDateTime updatedDate
) {}
