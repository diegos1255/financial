package com.financial.gmail.dto.labels;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateLabelRequest(
        @NotBlank @Size(max = 100) String name
) {}
