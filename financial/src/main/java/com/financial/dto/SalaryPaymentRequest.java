package com.financial.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record SalaryPaymentRequest(

        @NotNull(message = "paymentDate é obrigatório")
        LocalDate paymentDate,

        @NotNull(message = "amount é obrigatório")
        @DecimalMin(value = "0.01", message = "amount deve ser > 0")
        BigDecimal amount,

        @NotNull(message = "bankAccountId é obrigatório")
        UUID bankAccountId,

        @Size(max = 255, message = "description deve ter no máximo 255 caracteres")
        String description
) {}
