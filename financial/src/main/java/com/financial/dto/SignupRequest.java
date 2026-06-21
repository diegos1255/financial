package com.financial.dto;

import com.financial.validation.PasswordPolicy;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SignupRequest(
        @NotBlank(message = "Nome é obrigatório")
        @Size(max = 120, message = "Nome deve ter no máximo 120 caracteres")
        String name,

        @NotBlank(message = "Login é obrigatório")
        @Size(min = 3, max = 60, message = "Login deve ter entre 3 e 60 caracteres")
        String login,

        @NotBlank(message = "Senha é obrigatória")
        @PasswordPolicy
        String password
) {
}
