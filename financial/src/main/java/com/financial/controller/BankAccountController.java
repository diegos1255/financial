package com.financial.controller;

import com.financial.dto.ActiveRequest;
import com.financial.dto.BankAccountRequest;
import com.financial.dto.BankAccountResponse;
import com.financial.dto.PageResponse;
import com.financial.service.BankAccountService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
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
@RequestMapping("/api/bank-accounts")
public class BankAccountController {

    private final BankAccountService service;

    public BankAccountController(BankAccountService service) {
        this.service = service;
    }

    @GetMapping
    public PageResponse<BankAccountResponse> list(
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "false") boolean includeInactive,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return service.list(q, includeInactive, page, size);
    }

    @GetMapping("/all")
    public List<BankAccountResponse> listAll() {
        return service.listAll();
    }

    @GetMapping("/{id}")
    public BankAccountResponse get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BankAccountResponse create(@Valid @RequestBody BankAccountRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    public BankAccountResponse update(@PathVariable UUID id,
                                      @Valid @RequestBody BankAccountRequest request) {
        return service.update(id, request);
    }

    @PatchMapping("/{id}/active")
    public BankAccountResponse setActive(@PathVariable UUID id,
                                         @Valid @RequestBody ActiveRequest request) {
        return service.setActive(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.softDelete(id);
        return ResponseEntity.noContent().build();
    }
}
