package com.financial.controller;

import com.financial.dto.PjEntryRequest;
import com.financial.dto.PjEntryResponse;
import com.financial.model.PjEntry;
import com.financial.service.PjEntryService;
import com.financial.service.PjFileStorageService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Validator;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.OutputStream;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import com.financial.model.enums.PjEntryType;

@RestController
@RequestMapping("/api/pj-entries")
public class PjEntryController {

    private final PjEntryService service;
    private final PjFileStorageService fileStorage;
    private final Validator validator;

    public PjEntryController(PjEntryService service,
                             PjFileStorageService fileStorage,
                             Validator validator) {
        this.service = service;
        this.fileStorage = fileStorage;
        this.validator = validator;
    }

    @GetMapping
    public List<PjEntryResponse> list(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        return service.list(year, month);
    }

    @GetMapping("/{id}")
    public PjEntryResponse get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public PjEntryResponse create(
            @RequestParam("type") PjEntryType type,
            @RequestParam("year") Integer year,
            @RequestParam("month") Integer month,
            @RequestParam("amount") BigDecimal amount,
            @RequestPart("file") MultipartFile file) {
        PjEntryRequest request = new PjEntryRequest(type, year, month, amount);
        validate(request);
        return service.create(request, file);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PjEntryResponse update(
            @PathVariable UUID id,
            @RequestParam("type") PjEntryType type,
            @RequestParam("year") Integer year,
            @RequestParam("month") Integer month,
            @RequestParam("amount") BigDecimal amount,
            @RequestPart(value = "file", required = false) MultipartFile file) {
        PjEntryRequest request = new PjEntryRequest(type, year, month, amount);
        validate(request);
        return service.update(id, request, file);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/download")
    public void download(@PathVariable UUID id, HttpServletResponse response) throws IOException {
        PjEntry entry = service.findOwn(id);
        PjFileStorageService.DownloadedFile file = fileStorage.download(entry.getFileUrl());
        try (var stream = file.stream()) {
            response.setContentType(file.contentType());
            if (file.contentLength() != null) {
                response.setContentLengthLong(file.contentLength());
            }
            String encoded = URLEncoder.encode(entry.getFileName(), StandardCharsets.UTF_8).replace("+", "%20");
            response.setHeader(HttpHeaders.CONTENT_DISPOSITION,
                    "attachment; filename*=UTF-8''" + encoded);
            OutputStream out = response.getOutputStream();
            stream.transferTo(out);
            out.flush();
        }
    }

    private void validate(PjEntryRequest request) {
        Set<ConstraintViolation<PjEntryRequest>> violations = validator.validate(request);
        if (!violations.isEmpty()) {
            throw new ConstraintViolationException(violations);
        }
    }
}
