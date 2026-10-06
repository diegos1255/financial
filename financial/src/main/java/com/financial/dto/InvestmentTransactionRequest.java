package com.financial.dto;

import com.financial.model.enums.InvestmentTransactionType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;

public record InvestmentTransactionRequest(

        @NotNull(message = "type é obrigatório")
        InvestmentTransactionType type,

        @NotNull(message = "tradeDate é obrigatório")
        LocalDate tradeDate,

        @NotNull(message = "quantity é obrigatório")
        @Positive(message = "quantity deve ser maior que zero")
        Integer quantity,

        @DecimalMin(value = "0.0001", message = "unitPrice deve ser > 0")
        BigDecimal unitPrice
) {}
