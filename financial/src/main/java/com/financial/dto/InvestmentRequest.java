package com.financial.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record InvestmentRequest(

        @NotBlank(message = "ticker é obrigatório")
        @Size(max = 20, message = "ticker deve ter no máximo 20 caracteres")
        String ticker,

        @NotNull(message = "quantity é obrigatório")
        @Positive(message = "quantity deve ser maior que zero")
        Integer quantity,

        @Size(max = 255, message = "description deve ter no máximo 255 caracteres")
        String description
) {}
