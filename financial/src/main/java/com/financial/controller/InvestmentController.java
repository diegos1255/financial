package com.financial.controller;

import com.financial.dto.ActiveRequest;
import com.financial.dto.InvestmentPortfolioResponse;
import com.financial.dto.InvestmentRequest;
import com.financial.dto.InvestmentResponse;
import com.financial.dto.PageResponse;
import com.financial.service.InvestmentService;
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
@RequestMapping("/api/investments")
public class InvestmentController {

    private final InvestmentService service;

    public InvestmentController(InvestmentService service) {
        this.service = service;
    }

    @GetMapping
    public PageResponse<InvestmentResponse> list(
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "false") boolean includeInactive,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return service.list(q, includeInactive, page, size);
    }

    @GetMapping("/all")
    public List<InvestmentResponse> listAll() {
        return service.listAll();
    }

    @GetMapping("/portfolio")
    public InvestmentPortfolioResponse getPortfolio() {
        return service.getPortfolio();
    }

    @GetMapping("/{id}")
    public InvestmentResponse get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public InvestmentResponse create(@Valid @RequestBody InvestmentRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    public InvestmentResponse update(@PathVariable UUID id,
                                     @Valid @RequestBody InvestmentRequest request) {
        return service.update(id, request);
    }

    @PatchMapping("/{id}/active")
    public InvestmentResponse setActive(@PathVariable UUID id,
                                        @Valid @RequestBody ActiveRequest request) {
        return service.setActive(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.softDelete(id);
        return ResponseEntity.noContent().build();
    }
}
