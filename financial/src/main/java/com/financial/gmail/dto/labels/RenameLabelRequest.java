package com.financial.gmail.dto.labels;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RenameLabelRequest(
        @NotBlank @Size(max = 100) String newName
) {}
