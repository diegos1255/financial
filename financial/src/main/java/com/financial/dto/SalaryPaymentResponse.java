package com.financial.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record SalaryPaymentResponse(
        UUID id,
        LocalDate paymentDate,
        BigDecimal amount,
        UUID bankAccountId,
        String bankAccountName,
        String description
) {}
