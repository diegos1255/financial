package com.financial.gmail.dto.send;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record SendMessageRequest(
        @NotEmpty @Valid List<@Email @NotBlank String> to,
        @Valid List<@Email @NotBlank String> cc,
        @Valid List<@Email @NotBlank String> bcc,
        @NotBlank @Size(max = 200) String subject,
        @NotBlank @Size(max = 100_000) String body
) {}
