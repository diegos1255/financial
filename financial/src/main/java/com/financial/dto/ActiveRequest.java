package com.financial.dto;

import jakarta.validation.constraints.NotNull;

public record ActiveRequest(@NotNull Boolean active) {}
