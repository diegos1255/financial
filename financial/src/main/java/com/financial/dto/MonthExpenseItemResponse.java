package com.financial.dto;

import com.financial.model.enums.ExpenseType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Despesa que compoe o total do mes no dashboard. {@code date} e null para fixas
 * (valem o mes inteiro); {@code installmentLabel} so existe para parcelas ("3/10").
 */
public record MonthExpenseItemResponse(
        UUID expenseId,
        String description,
        String categoryName,
        String categoryColor,
        ExpenseType type,
        LocalDate date,
        BigDecimal amount,
        String installmentLabel
) {}
