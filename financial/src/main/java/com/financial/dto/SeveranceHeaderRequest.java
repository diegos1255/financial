package com.financial.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record SeveranceHeaderRequest(

        // null = total nao informado
        @DecimalMin(value = "0.01", message = "totalAmount deve ser > 0")
        BigDecimal totalAmount,

        @Size(max = 255, message = "description deve ter no máximo 255 caracteres")
        String description
) {}
