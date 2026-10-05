package com.financial.controller;

import com.financial.dto.SeveranceHeaderRequest;
import com.financial.dto.SeverancePaymentRequest;
import com.financial.dto.SeveranceResponse;
import com.financial.service.SeveranceService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
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
@RequestMapping("/api/severance")
public class SeveranceController {

    private final SeveranceService service;

    public SeveranceController(SeveranceService service) {
        this.service = service;
    }

    @GetMapping
    public SeveranceResponse get() {
        return service.get();
    }

    @PutMapping
    public SeveranceResponse upsertHeader(@Valid @RequestBody SeveranceHeaderRequest request) {
        return service.upsertHeader(request);
    }

    @PostMapping("/payments")
    @ResponseStatus(HttpStatus.CREATED)
    public SeveranceResponse addPayment(@Valid @RequestBody SeverancePaymentRequest request) {
        return service.addPayment(request);
    }

    @PutMapping("/payments/{id}")
    public SeveranceResponse updatePayment(@PathVariable UUID id,
                                           @Valid @RequestBody SeverancePaymentRequest request) {
        return service.updatePayment(id, request);
    }

    @DeleteMapping("/payments/{id}")
    public SeveranceResponse deletePayment(@PathVariable UUID id) {
        return service.deletePayment(id);
    }
}
