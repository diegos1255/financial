package com.financial.dto;

import com.financial.model.enums.InvestmentIncomeType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Informe {@code amount} (total) ou {@code unitValue} (por cota: total = cotas atuais x valor). */
public record InvestmentIncomeRequest(

        @NotNull(message = "type é obrigatório")
        InvestmentIncomeType type,

        @NotNull(message = "paymentDate é obrigatório")
        LocalDate paymentDate,

        @DecimalMin(value = "0.01", message = "amount deve ser > 0")
        BigDecimal amount,

        @DecimalMin(value = "0.000001", message = "unitValue deve ser > 0")
        BigDecimal unitValue
) {}
