package com.financial.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record InvestmentRequest(

        @NotBlank(message = "ticker é obrigatório")
        @Size(max = 20, message = "ticker deve ter no máximo 20 caracteres")
        String ticker,

        // So na criacao: vira o saldo inicial. Depois a quantidade vem das movimentacoes (WORK-36).
        @PositiveOrZero(message = "quantity não pode ser negativa")
        Integer quantity,

        @Size(max = 255, message = "description deve ter no máximo 255 caracteres")
        String description
) {}
