package com.financial.controller;

import com.financial.dto.BalanceResponse;
import com.financial.dto.CategoryExpenseResponse;
import com.financial.dto.MonthEvolutionResponse;
import com.financial.dto.MonthExpenseItemResponse;
import com.financial.service.DashboardService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
@Validated
public class DashboardController {

    private final DashboardService service;

    public DashboardController(DashboardService service) {
        this.service = service;
    }

    @GetMapping("/balance")
    public BalanceResponse balance(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        return service.balance(year, month);
    }

    @GetMapping("/evolution")
    public List<MonthEvolutionResponse> evolution(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(defaultValue = "6")
            @Min(value = 1, message = "months deve estar entre 1 e 12")
            @Max(value = 12, message = "months deve estar entre 1 e 12") int months) {
        return service.evolution(year, month, months);
    }

    @GetMapping("/month-expenses")
    public List<MonthExpenseItemResponse> monthExpenses(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        return service.monthExpenses(year, month);
    }

    @GetMapping("/expenses-by-category")
    public List<CategoryExpenseResponse> expensesByCategory(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        return service.expensesByCategory(year, month);
    }
}
