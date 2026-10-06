package com.financial.dto;

import com.financial.model.enums.InvestmentDataSource;
import com.financial.model.enums.InvestmentTransactionType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record InvestmentTransactionResponse(
        UUID id,
        UUID investmentId,
        InvestmentTransactionType type,
        LocalDate tradeDate,
        Integer quantity,
        BigDecimal unitPrice,
        BigDecimal total,
        InvestmentDataSource source
) {}
