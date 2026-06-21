package com.financial.controller;

import com.financial.dto.SalaryRequest;
import com.financial.dto.SalaryResponse;
import com.financial.service.SalaryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
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
@RequestMapping("/api/salaries")
public class SalaryController {

    private final SalaryService service;

    public SalaryController(SalaryService service) {
        this.service = service;
    }

    @GetMapping
    public List<SalaryResponse> list(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) UUID bankAccountId) {
        return service.list(year, month, bankAccountId);
    }

    @GetMapping("/{id}")
    public SalaryResponse get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SalaryResponse create(@Valid @RequestBody SalaryRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    public SalaryResponse update(@PathVariable UUID id,
                                 @Valid @RequestBody SalaryRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
