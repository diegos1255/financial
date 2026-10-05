package com.financial.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Rescisao do usuario: total + recebimentos. {@code id} e {@code totalAmount}
 * vem null enquanto nada foi cadastrado.
 */
public record SeveranceResponse(
        UUID id,
        BigDecimal totalAmount,
        BigDecimal receivedAmount,
        BigDecimal remainingAmount,
        int paymentsCount,
        String description,
        List<SeverancePaymentResponse> payments
) {}
