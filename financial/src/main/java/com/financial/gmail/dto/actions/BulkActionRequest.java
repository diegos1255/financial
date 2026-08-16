package com.financial.gmail.dto.actions;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record BulkActionRequest(
        @NotNull GmailBulkAction action,
        @NotEmpty @Size(max = 100) List<String> threadIds
) {}
