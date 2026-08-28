package com.financial.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChatQueryRequest(
        @NotBlank @Size(max = 500) String question,
        String sessionId
) {}
