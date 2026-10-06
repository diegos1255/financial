package com.financial.service;

import com.financial.auth.CurrentUser;
import com.financial.dto.InvestmentIncomeRequest;
import com.financial.dto.InvestmentIncomeResponse;
import com.financial.dto.InvestmentTransactionRequest;
import com.financial.dto.InvestmentTransactionResponse;
import com.financial.exception.InvalidInvestmentOperationException;
import com.financial.exception.ResourceNotFoundException;
import com.financial.model.Investment;
import com.financial.model.InvestmentIncome;
import com.financial.model.InvestmentTransaction;
import com.financial.model.User;
import com.financial.model.enums.InvestmentDataSource;
import com.financial.model.enums.InvestmentTransactionType;
import com.financial.repository.InvestmentIncomeRepository;
import com.financial.repository.InvestmentRepository;
import com.financial.repository.InvestmentTransactionRepository;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/**
 * Movimentacoes (aportes) e proventos de investimentos (WORK-36).
 * A quantidade do investimento deixa de ser editada: e sempre INITIAL + BUY - SELL.
 */
@Service
@Transactional
public class InvestmentLedgerService {

    private final InvestmentRepository investmentRepository;
    private final InvestmentTransactionRepository transactionRepository;
    private final InvestmentIncomeRepository incomeRepository;
    private final EntityManager entityManager;

    public InvestmentLedgerService(InvestmentRepository investmentRepository,
                                   InvestmentTransactionRepository transactionRepository,
                                   InvestmentIncomeRepository incomeRepository,
                                   EntityManager entityManager) {
        this.investmentRepository = investmentRepository;
        this.transactionRepository = transactionRepository;
        this.incomeRepository = incomeRepository;
        this.entityManager = entityManager;
    }

    // ---------- movimentacoes ----------

    @Transactional(readOnly = true)
    public List<InvestmentTransactionResponse> listTransactions(UUID investmentId) {
        loadOwned(investmentId);
        return transactionRepository.findByInvestmentIdOrderByTradeDateAscCreatedDateAsc(investmentId).stream()
                .map(InvestmentLedgerService::toResponse)
                .toList();
    }

    public InvestmentTransactionResponse addTransaction(UUID investmentId, InvestmentTransactionRequest request) {
        if (request.type() == InvestmentTransactionType.INITIAL) {
            throw new InvalidInvestmentOperationException("Saldo inicial é calculado pelo sistema");
        }
        UUID userId = CurrentUser.id();
        Investment investment = loadOwned(investmentId);
        InvestmentTransaction tx = InvestmentTransaction.builder()
                .investment(investment)
                .user(entityManager.getReference(User.class, userId))
                .type(request.type())
                .tradeDate(request.tradeDate())
                .quantity(request.quantity())
                .unitPrice(request.unitPrice())
                .total(totalOf(request.quantity(), request.unitPrice()))
                .source(InvestmentDataSource.MANUAL)
                .build();

        List<InvestmentTransaction> all = new ArrayList<>(
                transactionRepository.findByInvestmentIdOrderByTradeDateAscCreatedDateAsc(investmentId));
        all.add(tx);
        ensureNeverNegative(all);

        transactionRepository.save(tx);
        recalculateQuantity(investment, all);
        return toResponse(tx);
    }

    public void deleteTransaction(UUID transactionId) {
        UUID userId = CurrentUser.id();
        InvestmentTransaction tx = transactionRepository.findByIdAndUserId(transactionId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Movimentação não encontrada"));
        Investment investment = tx.getInvestment();

        List<InvestmentTransaction> remaining = new ArrayList<>(
                transactionRepository.findByInvestmentIdOrderByTradeDateAscCreatedDateAsc(investment.getId()));
        remaining.removeIf(t -> t.getId().equals(tx.getId()));
        ensureNeverNegative(remaining);

        transactionRepository.delete(tx);
        recalculateQuantity(investment, remaining);
    }

    /**
     * Quantidade = INITIAL + BUY - SELL. Zerar a posicao desativa o ativo; voltar a ter cotas
     * depois de zerado reativa (uma desativacao manual com cotas e respeitada).
     */
    public void recalculateQuantity(Investment investment, List<InvestmentTransaction> transactions) {
        int previous = investment.getQuantity() == null ? 0 : investment.getQuantity();
        int quantity = transactions.stream().mapToInt(InvestmentLedgerService::signedQuantity).sum();
        investment.setQuantity(quantity);
        if (quantity == 0) {
            investment.setActive(false);
        } else if (previous == 0) {
            investment.setActive(true);
        }
        investmentRepository.save(investment);
    }

    /** Uma venda nunca pode deixar a posicao negativa em nenhuma data. */
    static void ensureNeverNegative(List<InvestmentTransaction> transactions) {
        int running = 0;
        List<InvestmentTransaction> ordered = transactions.stream()
                .sorted(Comparator.comparing(InvestmentTransaction::getTradeDate)
                        .thenComparing(t -> t.getType() == InvestmentTransactionType.SELL ? 1 : 0))
                .toList();
        for (InvestmentTransaction t : ordered) {
            running += signedQuantity(t);
            if (running < 0) {
                throw new InvalidInvestmentOperationException(
                        "A operação deixaria a posição negativa em " + t.getTradeDate());
            }
        }
    }

    static int signedQuantity(InvestmentTransaction t) {
        return t.getType() == InvestmentTransactionType.SELL ? -t.getQuantity() : t.getQuantity();
    }

    // ---------- proventos ----------

    @Transactional(readOnly = true)
    public List<InvestmentIncomeResponse> listIncomes(UUID investmentId) {
        loadOwned(investmentId);
        return incomeRepository.findByInvestmentIdOrderByPaymentDateDesc(investmentId).stream()
                .map(InvestmentLedgerService::toResponse)
                .toList();
    }

    public InvestmentIncomeResponse addIncome(UUID investmentId, InvestmentIncomeRequest request) {
        UUID userId = CurrentUser.id();
        Investment investment = loadOwned(investmentId);
        Integer quantity = null;
        BigDecimal amount = request.amount();
        if (request.unitValue() != null) {
            quantity = investment.getQuantity() == null ? 0 : investment.getQuantity();
            amount = totalOf(quantity, request.unitValue());
        }
        if (amount == null || amount.signum() <= 0) {
            throw new InvalidInvestmentOperationException(
                    request.unitValue() != null ? "Ativo sem cotas: informe o valor total" : "Informe o valor do provento");
        }
        InvestmentIncome income = InvestmentIncome.builder()
                .investment(investment)
                .user(entityManager.getReference(User.class, userId))
                .type(request.type())
                .paymentDate(request.paymentDate())
                .quantity(quantity)
                .unitValue(request.unitValue())
                .amount(amount)
                .source(InvestmentDataSource.MANUAL)
                .build();
        return toResponse(incomeRepository.save(income));
    }

    public void deleteIncome(UUID incomeId) {
        InvestmentIncome income = incomeRepository.findByIdAndUserId(incomeId, CurrentUser.id())
                .orElseThrow(() -> new ResourceNotFoundException("Provento não encontrado"));
        incomeRepository.delete(income);
    }

    // ---------- apoio ----------

    private Investment loadOwned(UUID investmentId) {
        return investmentRepository.findByIdAndUserId(investmentId, CurrentUser.id())
                .orElseThrow(() -> new ResourceNotFoundException("Investimento não encontrado"));
    }

    static BigDecimal totalOf(Integer quantity, BigDecimal unitPrice) {
        return unitPrice == null ? null
                : unitPrice.multiply(BigDecimal.valueOf(quantity)).setScale(2, RoundingMode.HALF_UP);
    }

    static InvestmentTransactionResponse toResponse(InvestmentTransaction t) {
        return new InvestmentTransactionResponse(t.getId(), t.getInvestment().getId(), t.getType(),
                t.getTradeDate(), t.getQuantity(), t.getUnitPrice(), t.getTotal(), t.getSource());
    }

    static InvestmentIncomeResponse toResponse(InvestmentIncome i) {
        return new InvestmentIncomeResponse(i.getId(), i.getInvestment().getId(), i.getType(),
                i.getPaymentDate(), i.getQuantity(), i.getUnitValue(), i.getAmount(), i.getSource());
    }

    /** Usado pela criacao do investimento: a quantidade informada vira o saldo inicial. */
    public void createInitial(Investment investment, UUID userId, int quantity, LocalDate date) {
        if (quantity <= 0) {
            return;
        }
        InvestmentTransaction initial = InvestmentTransaction.builder()
                .investment(investment)
                .user(entityManager.getReference(User.class, userId))
                .type(InvestmentTransactionType.INITIAL)
                .tradeDate(date)
                .quantity(quantity)
                .source(InvestmentDataSource.MANUAL)
                .build();
        transactionRepository.save(initial);
    }
}
