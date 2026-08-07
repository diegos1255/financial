package com.financial.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.UUID;

public record ExpenseUpdateRequest(

        @NotBlank(message = "description é obrigatório")
        @Size(max = 200, message = "description deve ter no máximo 200 caracteres")
        String description,

        @NotNull(message = "categoryId é obrigatório")
        UUID categoryId,

        @NotNull(message = "bankAccountId é obrigatório")
        UUID bankAccountId,

        @DecimalMin(value = "0.01", message = "totalAmount deve ser maior que zero")
        BigDecimal totalAmount
) {}
