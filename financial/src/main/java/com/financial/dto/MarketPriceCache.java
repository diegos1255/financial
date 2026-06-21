package com.financial.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record MarketPriceCache(
        BigDecimal price,
        BigDecimal changePercent,
        OffsetDateTime fetchedAt
) {}
