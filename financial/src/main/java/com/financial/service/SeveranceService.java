package com.financial.service;

import com.financial.auth.CurrentUser;
import com.financial.dto.SeveranceHeaderRequest;
import com.financial.dto.SeverancePaymentRequest;
import com.financial.dto.SeverancePaymentResponse;
import com.financial.dto.SeveranceResponse;
import com.financial.exception.PaymentDateInFutureException;
import com.financial.exception.ResourceNotFoundException;
import com.financial.mapper.SeveranceMapper;
import com.financial.model.BankAccount;
import com.financial.model.Severance;
import com.financial.model.SeverancePayment;
import com.financial.model.User;
import com.financial.repository.BankAccountRepository;
import com.financial.repository.SeverancePaymentRepository;
import com.financial.repository.SeveranceRepository;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Rescisao (WORK-31): total + recebimentos lancados pelo usuario.
 * Toda escrita devolve a rescisao inteira atualizada.
 */
@Service
@Transactional
public class SeveranceService {

    private final SeveranceRepository repository;
    private final SeverancePaymentRepository paymentRepository;
    private final BankAccountRepository bankAccountRepository;
    private final SeveranceMapper mapper;
    private final EntityManager entityManager;

    public SeveranceService(SeveranceRepository repository,
                            SeverancePaymentRepository paymentRepository,
                            BankAccountRepository bankAccountRepository,
                            SeveranceMapper mapper,
                            EntityManager entityManager) {
        this.repository = repository;
        this.paymentRepository = paymentRepository;
        this.bankAccountRepository = bankAccountRepository;
        this.mapper = mapper;
        this.entityManager = entityManager;
    }

    @Transactional(readOnly = true)
    public SeveranceResponse get() {
        return toResponse(repository.findByUserId(CurrentUser.id()).orElse(null));
    }

    public SeveranceResponse upsertHeader(SeveranceHeaderRequest request) {
        Severance severance = findOrCreate(CurrentUser.id());
        severance.setTotalAmount(request.totalAmount());
        severance.setDescription(request.description());
        return toResponse(repository.save(severance));
    }

    public SeveranceResponse addPayment(SeverancePaymentRequest request) {
        UUID userId = CurrentUser.id();
        validate(request, userId);

        Severance severance = findOrCreate(userId);
        SeverancePayment payment = SeverancePayment.builder()
                .severance(severance)
                .user(entityManager.getReference(User.class, userId))
                .build();
        apply(payment, request);
        paymentRepository.save(payment);
        return toResponse(severance);
    }

    public SeveranceResponse updatePayment(UUID id, SeverancePaymentRequest request) {
        UUID userId = CurrentUser.id();
        SeverancePayment payment = loadOwnedPayment(id, userId);
        validate(request, userId);

        apply(payment, request);
        paymentRepository.save(payment);
        return toResponse(payment.getSeverance());
    }

    public SeveranceResponse deletePayment(UUID id) {
        SeverancePayment payment = loadOwnedPayment(id, CurrentUser.id());
        Severance severance = payment.getSeverance();
        paymentRepository.delete(payment);
        paymentRepository.flush();
        return toResponse(severance);
    }

    private Severance findOrCreate(UUID userId) {
        return repository.findByUserId(userId)
                .orElseGet(() -> repository.save(Severance.builder()
                        .user(entityManager.getReference(User.class, userId))
                        .build()));
    }

    private void validate(SeverancePaymentRequest request, UUID userId) {
        bankAccountRepository.findByIdAndUserId(request.bankAccountId(), userId)
                .orElseThrow(() -> new ResourceNotFoundException("Conta bancária não encontrada"));
        if (request.paymentDate().isAfter(LocalDate.now())) {
            throw new PaymentDateInFutureException("A data do recebimento não pode ser futura");
        }
    }

    private void apply(SeverancePayment payment, SeverancePaymentRequest request) {
        payment.setBankAccount(entityManager.getReference(BankAccount.class, request.bankAccountId()));
        payment.setPaymentDate(request.paymentDate());
        payment.setAmount(request.amount());
        payment.setDescription(request.description());
    }

    private SeveranceResponse toResponse(Severance severance) {
        if (severance == null) {
            return new SeveranceResponse(null, null, BigDecimal.ZERO, null, 0, null, List.of());
        }
        List<SeverancePaymentResponse> payments = paymentRepository
                .findBySeveranceIdOrderByPaymentDateAscCreatedDateAsc(severance.getId()).stream()
                .map(mapper::toPaymentResponse)
                .toList();
        BigDecimal received = payments.stream()
                .map(SeverancePaymentResponse::amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal total = severance.getTotalAmount();
        BigDecimal remaining = total == null ? null : total.subtract(received);

        return new SeveranceResponse(severance.getId(), total, received, remaining,
                payments.size(), severance.getDescription(), payments);
    }

    private SeverancePayment loadOwnedPayment(UUID id, UUID userId) {
        return paymentRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Recebimento não encontrado"));
    }
}
