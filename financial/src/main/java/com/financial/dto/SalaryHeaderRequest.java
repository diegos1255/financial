package com.financial.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record SalaryHeaderRequest(

        // null = total nao informado
        @DecimalMin(value = "0.01", message = "expectedAmount deve ser > 0")
        BigDecimal expectedAmount,

        @Size(max = 255, message = "description deve ter no máximo 255 caracteres")
        String description
) {}
