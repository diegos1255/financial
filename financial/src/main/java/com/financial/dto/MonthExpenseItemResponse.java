package com.financial.dto;

import com.financial.model.enums.ExpenseType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Saida que compoe o mes no dashboard. {@code kind}: EXPENSE (despesa; {@code type} preenchido)
 * ou PJ_TAX (imposto PJ do mes anterior; {@code type} null). {@code date} e null para fixas e impostos;
 * {@code installmentLabel} so existe para parcelas ("3/10").
 */
public record MonthExpenseItemResponse(
        String kind,
        UUID expenseId,
        String description,
        String categoryName,
        String categoryColor,
        ExpenseType type,
        LocalDate date,
        BigDecimal amount,
        String installmentLabel
) {}
