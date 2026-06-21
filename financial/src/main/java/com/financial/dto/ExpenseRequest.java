package com.financial.dto;

import com.financial.model.enums.ExpenseType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record ExpenseRequest(

        @NotBlank(message = "description é obrigatório")
        @Size(max = 200, message = "description deve ter no máximo 200 caracteres")
        String description,

        @NotNull(message = "totalAmount é obrigatório")
        @DecimalMin(value = "0.00", message = "totalAmount deve ser >= 0")
        BigDecimal totalAmount,

        @NotNull(message = "expenseType é obrigatório (FIXED, INSTALLMENT ou VARIABLE)")
        ExpenseType expenseType,

        @Min(value = 1, message = "installmentsCount deve ser >= 1")
        Integer installmentsCount,

        @NotNull(message = "purchaseDate é obrigatório")
        LocalDate purchaseDate,

        LocalDate firstDueDate,

        @NotNull(message = "categoryId é obrigatório")
        UUID categoryId,

        @NotNull(message = "bankAccountId é obrigatório")
        UUID bankAccountId
) {}
