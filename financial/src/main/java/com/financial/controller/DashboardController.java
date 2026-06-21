package com.financial.controller;

import com.financial.dto.BalanceResponse;
import com.financial.dto.CategoryExpenseResponse;
import com.financial.service.DashboardService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
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

    @GetMapping("/expenses-by-category")
    public List<CategoryExpenseResponse> expensesByCategory(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        return service.expensesByCategory(year, month);
    }
}
