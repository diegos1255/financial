package com.financial.controller;

import com.financial.dto.ActiveRequest;
import com.financial.dto.ExpenseCategoryRequest;
import com.financial.dto.ExpenseCategoryResponse;
import com.financial.dto.PageResponse;
import com.financial.service.ExpenseCategoryService;
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
@RequestMapping("/api/categories")
public class ExpenseCategoryController {

    private final ExpenseCategoryService service;

    public ExpenseCategoryController(ExpenseCategoryService service) {
        this.service = service;
    }

    @GetMapping
    public PageResponse<ExpenseCategoryResponse> list(
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "false") boolean includeInactive,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return service.list(q, includeInactive, page, size);
    }

    @GetMapping("/all")
    public List<ExpenseCategoryResponse> listAll() {
        return service.listAll();
    }

    @GetMapping("/{id}")
    public ExpenseCategoryResponse get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ExpenseCategoryResponse create(@Valid @RequestBody ExpenseCategoryRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    public ExpenseCategoryResponse update(@PathVariable UUID id,
                                          @Valid @RequestBody ExpenseCategoryRequest request) {
        return service.update(id, request);
    }

    @PatchMapping("/{id}/active")
    public ExpenseCategoryResponse setActive(@PathVariable UUID id,
                                             @Valid @RequestBody ActiveRequest request) {
        return service.setActive(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.softDelete(id);
        return ResponseEntity.noContent().build();
    }
}
