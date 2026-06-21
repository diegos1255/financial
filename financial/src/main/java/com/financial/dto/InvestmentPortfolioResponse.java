package com.financial.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record InvestmentPortfolioResponse(
        List<InvestmentPortfolioItem> items,
        BigDecimal totalMarketValue,
        OffsetDateTime fetchedAt
) {}
