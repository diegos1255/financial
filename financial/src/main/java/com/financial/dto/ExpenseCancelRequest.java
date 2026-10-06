package com.financial.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ExpenseCancelRequest(

        @NotBlank(message = "Informe o motivo do cancelamento")
        @Size(max = 255, message = "reason deve ter no máximo 255 caracteres")
        String reason
) {}
