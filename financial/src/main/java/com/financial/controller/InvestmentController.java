package com.financial.controller;

import com.financial.dto.ActiveRequest;
import com.financial.dto.InvestmentIncomeRequest;
import com.financial.dto.InvestmentIncomeResponse;
import com.financial.dto.InvestmentPortfolioResponse;
import com.financial.dto.InvestmentRequest;
import com.financial.dto.InvestmentResponse;
import com.financial.dto.InvestmentTransactionRequest;
import com.financial.dto.InvestmentTransactionResponse;
import com.financial.dto.PageResponse;
import com.financial.dto.PortfolioHistoryResponse;
import com.financial.service.InvestmentLedgerService;
import com.financial.service.InvestmentService;
import com.financial.service.PortfolioHistoryService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
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
@Validated
@ConditionalOnProperty(value = "features.investments-enabled", havingValue = "true", matchIfMissing = true)
public class InvestmentController {

    private final InvestmentService service;
    private final InvestmentLedgerService ledgerService;
    private final PortfolioHistoryService historyService;

    public InvestmentController(InvestmentService service,
                                InvestmentLedgerService ledgerService,
                                PortfolioHistoryService historyService) {
        this.service = service;
        this.ledgerService = ledgerService;
        this.historyService = historyService;
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

    @GetMapping("/history")
    public PortfolioHistoryResponse history(
            @RequestParam(defaultValue = "12")
            @Min(value = 1, message = "months deve estar entre 1 e 24")
            @Max(value = 24, message = "months deve estar entre 1 e 24") int months) {
        return historyService.history(months);
    }

    @GetMapping("/{id}/transactions")
    public List<InvestmentTransactionResponse> transactions(@PathVariable UUID id) {
        return ledgerService.listTransactions(id);
    }

    @PostMapping("/{id}/transactions")
    @ResponseStatus(HttpStatus.CREATED)
    public InvestmentTransactionResponse addTransaction(@PathVariable UUID id,
                                                        @Valid @RequestBody InvestmentTransactionRequest request) {
        return ledgerService.addTransaction(id, request);
    }

    @DeleteMapping("/transactions/{transactionId}")
    public ResponseEntity<Void> deleteTransaction(@PathVariable UUID transactionId) {
        ledgerService.deleteTransaction(transactionId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/incomes")
    public List<InvestmentIncomeResponse> incomes(@PathVariable UUID id) {
        return ledgerService.listIncomes(id);
    }

    @PostMapping("/{id}/incomes")
    @ResponseStatus(HttpStatus.CREATED)
    public InvestmentIncomeResponse addIncome(@PathVariable UUID id,
                                              @Valid @RequestBody InvestmentIncomeRequest request) {
        return ledgerService.addIncome(id, request);
    }

    @DeleteMapping("/incomes/{incomeId}")
    public ResponseEntity<Void> deleteIncome(@PathVariable UUID incomeId) {
        ledgerService.deleteIncome(incomeId);
        return ResponseEntity.noContent().build();
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
