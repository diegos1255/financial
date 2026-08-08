package com.financial.dto;

import com.financial.model.enums.PjEntryType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record PjEntryRequest(

        @NotNull(message = "type é obrigatório")
        PjEntryType type,

        @NotNull(message = "year é obrigatório")
        @Min(value = 2000, message = "year deve ser >= 2000")
        @Max(value = 2100, message = "year deve ser <= 2100")
        Integer year,

        @NotNull(message = "month é obrigatório")
        @Min(value = 1, message = "month deve ser entre 1 e 12")
        @Max(value = 12, message = "month deve ser entre 1 e 12")
        Integer month,

        @NotNull(message = "amount é obrigatório")
        @DecimalMin(value = "0.01", message = "amount deve ser maior que zero")
        BigDecimal amount
) {}
