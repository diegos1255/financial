package com.financial.dto;

import java.math.BigDecimal;

public record BalanceResponse(
        Integer year,
        Integer month,
        BigDecimal salary,
        BigDecimal totalExpenses,
        BigDecimal balance,
        BalanceBreakdown breakdown
) {}
