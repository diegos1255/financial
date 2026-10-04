package com.financial.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Salario de uma competencia: cabecalho (total previsto) + recebimentos.
 * {@code id} e {@code expectedAmount} vem null quando o mes ainda nao tem cabecalho.
 */
public record SalaryMonthResponse(
        UUID id,
        Integer referenceYear,
        Integer referenceMonth,
        BigDecimal expectedAmount,
        boolean expectedFromInvoice,
        BigDecimal receivedAmount,
        BigDecimal remainingAmount,
        String description,
        List<SalaryPaymentResponse> payments
) {}
