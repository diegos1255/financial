package com.financial.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record CategoryExpenseResponse(
        UUID categoryId,
        String categoryName,
        String color,
        BigDecimal total
) {}
