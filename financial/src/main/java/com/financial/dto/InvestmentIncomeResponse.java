package com.financial.dto;

import com.financial.model.enums.InvestmentDataSource;
import com.financial.model.enums.InvestmentIncomeType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record InvestmentIncomeResponse(
        UUID id,
        UUID investmentId,
        InvestmentIncomeType type,
        LocalDate paymentDate,
        Integer quantity,
        BigDecimal unitValue,
        BigDecimal amount,
        InvestmentDataSource source
) {}
