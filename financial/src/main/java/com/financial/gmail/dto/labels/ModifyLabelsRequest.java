package com.financial.gmail.dto.labels;

import jakarta.validation.constraints.NotNull;

import java.util.List;

public record ModifyLabelsRequest(
        @NotNull List<String> add,
        @NotNull List<String> remove
) {}
