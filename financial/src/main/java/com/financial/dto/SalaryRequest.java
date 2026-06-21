package com.financial.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.UUID;

public record SalaryRequest(

        @NotNull(message = "bankAccountId é obrigatório")
        UUID bankAccountId,

        @NotNull(message = "referenceYear é obrigatório")
        @Min(value = 2000, message = "referenceYear deve ser >= 2000")
        @Max(value = 2100, message = "referenceYear deve ser <= 2100")
        Integer referenceYear,

        @NotNull(message = "referenceMonth é obrigatório")
        @Min(value = 1, message = "referenceMonth deve estar entre 1 e 12")
        @Max(value = 12, message = "referenceMonth deve estar entre 1 e 12")
        Integer referenceMonth,

        @NotNull(message = "amount é obrigatório")
        @DecimalMin(value = "0.00", message = "amount deve ser >= 0")
        BigDecimal amount,

        @Size(max = 255, message = "description deve ter no máximo 255 caracteres")
        String description
) {}
