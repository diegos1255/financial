package com.financial.dto;

import java.time.LocalDate;

public record InstallmentPayRequest(
        LocalDate paidAt
) {}
