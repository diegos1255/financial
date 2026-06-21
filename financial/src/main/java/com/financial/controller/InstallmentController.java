package com.financial.controller;

import com.financial.auth.CurrentUser;
import com.financial.dto.InstallmentPayRequest;
import com.financial.dto.InstallmentResponse;
import com.financial.service.InstallmentService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/installments")
public class InstallmentController {

    private final InstallmentService installmentService;

    public InstallmentController(InstallmentService installmentService) {
        this.installmentService = installmentService;
    }

    @PatchMapping("/{id}/pay")
    @ResponseStatus(HttpStatus.OK)
    public InstallmentResponse pay(
            @PathVariable UUID id,
            @RequestBody(required = false) InstallmentPayRequest request) {
        LocalDate paidAt = (request != null && request.paidAt() != null)
                ? request.paidAt()
                : LocalDate.now();
        return installmentService.markAsPaid(id, CurrentUser.id(), paidAt);
    }

    @PatchMapping("/{id}/unpay")
    @ResponseStatus(HttpStatus.OK)
    public InstallmentResponse unpay(@PathVariable UUID id) {
        return installmentService.markAsPending(id, CurrentUser.id());
    }
}
