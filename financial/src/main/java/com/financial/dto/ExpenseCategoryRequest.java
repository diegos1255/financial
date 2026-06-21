package com.financial.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ExpenseCategoryRequest(

        @NotBlank(message = "name é obrigatório")
        @Size(max = 80, message = "name deve ter no máximo 80 caracteres")
        String name,

        @Size(max = 255, message = "description deve ter no máximo 255 caracteres")
        String description,

        @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "color deve ser um hex válido (ex: #dc2626)")
        String color
) {}
