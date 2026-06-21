package com.financial.dto;

import java.math.BigDecimal;

public record BalanceBreakdown(
        BigDecimal fixed,
        BigDecimal installments,
        BigDecimal installmentsPaid,
        BigDecimal installmentsPending,
        BigDecimal variable
) {}
