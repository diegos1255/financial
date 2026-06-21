package com.financial.controller;

import com.financial.auth.CurrentUser;
import com.financial.dto.ExpenseRequest;
import com.financial.dto.ExpenseResponse;
import com.financial.dto.ExpenseUpdateRequest;
import com.financial.dto.InstallmentResponse;
import com.financial.exception.ResourceNotFoundException;
import com.financial.mapper.InstallmentMapper;
import com.financial.model.enums.ExpenseStatus;
import com.financial.repository.ExpenseRepository;
import com.financial.repository.InstallmentRepository;
import com.financial.service.ExpenseService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/expenses")
public class ExpenseController {

    private final ExpenseService service;
    private final ExpenseRepository expenseRepository;
    private final InstallmentRepository installmentRepository;
    private final InstallmentMapper installmentMapper;

    public ExpenseController(ExpenseService service,
                             ExpenseRepository expenseRepository,
                             InstallmentRepository installmentRepository,
                             InstallmentMapper installmentMapper) {
        this.service = service;
        this.expenseRepository = expenseRepository;
        this.installmentRepository = installmentRepository;
        this.installmentMapper = installmentMapper;
    }

    @GetMapping
    public List<ExpenseResponse> list(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) ExpenseStatus status,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) UUID bankAccountId) {
        return service.list(year, month, status, categoryId, bankAccountId);
    }

    @GetMapping("/{id}")
    public ExpenseResponse get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ExpenseResponse create(@Valid @RequestBody ExpenseRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    public ExpenseResponse update(@PathVariable UUID id,
                                  @Valid @RequestBody ExpenseUpdateRequest request) {
        return service.update(id, request);
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<Void> cancel(@PathVariable UUID id) {
        service.cancel(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/installments")
    public List<InstallmentResponse> listInstallments(@PathVariable UUID id) {
        expenseRepository.findByIdAndUserId(id, CurrentUser.id())
                .orElseThrow(() -> new ResourceNotFoundException("Despesa não encontrada"));
        return installmentMapper.toResponseList(
                installmentRepository.findByExpenseIdOrderByInstallmentNumberAsc(id));
    }
}
