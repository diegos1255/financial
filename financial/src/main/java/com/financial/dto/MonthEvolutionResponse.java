package com.financial.dto;

import java.math.BigDecimal;

public record MonthEvolutionResponse(
        Integer year,
        Integer month,
        BigDecimal salary,
        BigDecimal totalExpenses,
        BigDecimal balance
) {}
