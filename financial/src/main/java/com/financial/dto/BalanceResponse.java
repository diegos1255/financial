package com.financial.dto;

import java.math.BigDecimal;

public record BalanceResponse(
        Integer year,
        Integer month,
        BigDecimal salary,
        BigDecimal totalExpenses,
        // Impostos PJ do mes ANTERIOR (a NF de setembro paga o salario de outubro) — WORK-35.
        BigDecimal pjTaxes,
        BigDecimal balance,
        BalanceBreakdown breakdown
) {}
