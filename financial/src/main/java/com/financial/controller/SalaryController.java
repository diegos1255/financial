package com.financial.controller;

import com.financial.dto.SalaryHeaderRequest;
import com.financial.dto.SalaryMonthResponse;
import com.financial.dto.SalaryPaymentRequest;
import com.financial.service.SalaryService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/salaries")
@Validated
public class SalaryController {

    private static final String YEAR_MSG = "year deve estar entre 2000 e 2100";
    private static final String MONTH_MSG = "month deve estar entre 1 e 12";

    private final SalaryService service;

    public SalaryController(SalaryService service) {
        this.service = service;
    }

    @GetMapping("/{year}/{month}")
    public SalaryMonthResponse getMonth(
            @PathVariable @Min(value = 2000, message = YEAR_MSG) @Max(value = 2100, message = YEAR_MSG) int year,
            @PathVariable @Min(value = 1, message = MONTH_MSG) @Max(value = 12, message = MONTH_MSG) int month) {
        return service.getMonth(year, month);
    }

    @PutMapping("/{year}/{month}")
    public SalaryMonthResponse upsertHeader(
            @PathVariable @Min(value = 2000, message = YEAR_MSG) @Max(value = 2100, message = YEAR_MSG) int year,
            @PathVariable @Min(value = 1, message = MONTH_MSG) @Max(value = 12, message = MONTH_MSG) int month,
            @Valid @RequestBody SalaryHeaderRequest request) {
        return service.upsertHeader(year, month, request);
    }

    @PostMapping("/{year}/{month}/payments")
    @ResponseStatus(HttpStatus.CREATED)
    public SalaryMonthResponse addPayment(
            @PathVariable @Min(value = 2000, message = YEAR_MSG) @Max(value = 2100, message = YEAR_MSG) int year,
            @PathVariable @Min(value = 1, message = MONTH_MSG) @Max(value = 12, message = MONTH_MSG) int month,
            @Valid @RequestBody SalaryPaymentRequest request) {
        return service.addPayment(year, month, request);
    }

    @PutMapping("/payments/{id}")
    public SalaryMonthResponse updatePayment(@PathVariable UUID id,
                                             @Valid @RequestBody SalaryPaymentRequest request) {
        return service.updatePayment(id, request);
    }

    @DeleteMapping("/payments/{id}")
    public SalaryMonthResponse deletePayment(@PathVariable UUID id) {
        return service.deletePayment(id);
    }
}
