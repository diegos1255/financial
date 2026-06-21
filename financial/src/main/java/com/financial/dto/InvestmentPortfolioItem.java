package com.financial.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record InvestmentPortfolioItem(
        UUID id,
        String ticker,
        Integer quantity,
        BigDecimal currentPrice,
        BigDecimal changePercent,
        BigDecimal marketValue,
        boolean priceUnavailable
) {}
