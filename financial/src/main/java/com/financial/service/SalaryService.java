package com.financial.service;

import com.financial.auth.CurrentUser;
import com.financial.dto.SalaryHeaderRequest;
import com.financial.dto.SalaryMonthResponse;
import com.financial.dto.SalaryPaymentRequest;
import com.financial.dto.SalaryPaymentResponse;
import com.financial.exception.ResourceNotFoundException;
import com.financial.exception.SalaryPaymentOutOfCompetenceException;
import com.financial.mapper.SalaryMapper;
import com.financial.model.BankAccount;
import com.financial.model.Salary;
import com.financial.model.SalaryPayment;
import com.financial.model.User;
import com.financial.model.enums.PjEntryType;
import com.financial.repository.BankAccountRepository;
import com.financial.repository.PjEntryRepository;
import com.financial.repository.SalaryPaymentRepository;
import com.financial.repository.SalaryRepository;
import jakarta.persistence.EntityManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

/**
 * Salario por competencia (WORK-30): cabecalho com total previsto + recebimentos datados.
 * Toda escrita devolve o mes inteiro atualizado.
 */
@Service
@Transactional
public class SalaryService {

    private static final Logger log = LoggerFactory.getLogger(SalaryService.class);

    private final SalaryRepository repository;
    private final SalaryPaymentRepository paymentRepository;
    private final BankAccountRepository bankAccountRepository;
    private final PjEntryRepository pjEntryRepository;
    private final SalaryMapper mapper;
    private final EntityManager entityManager;

    public SalaryService(SalaryRepository repository,
                         SalaryPaymentRepository paymentRepository,
                         BankAccountRepository bankAccountRepository,
                         PjEntryRepository pjEntryRepository,
                         SalaryMapper mapper,
                         EntityManager entityManager) {
        this.repository = repository;
        this.paymentRepository = paymentRepository;
        this.bankAccountRepository = bankAccountRepository;
        this.pjEntryRepository = pjEntryRepository;
        this.mapper = mapper;
        this.entityManager = entityManager;
    }

    @Transactional(readOnly = true)
    public SalaryMonthResponse getMonth(int year, int month) {
        UUID userId = CurrentUser.id();
        Salary salary = repository.findByUserIdAndReferenceYearAndReferenceMonth(userId, year, month).orElse(null);
        return toMonthResponse(userId, year, month, salary);
    }

    public SalaryMonthResponse upsertHeader(int year, int month, SalaryHeaderRequest request) {
        UUID userId = CurrentUser.id();
        Salary salary = findOrCreate(userId, year, month);
        salary.setExpectedAmount(request.expectedAmount());
        salary.setDescription(request.description());
        repository.save(salary);
        return toMonthResponse(userId, year, month, salary);
    }

    public SalaryMonthResponse addPayment(int year, int month, SalaryPaymentRequest request) {
        UUID userId = CurrentUser.id();
        ensureBankAccountBelongsToUser(request.bankAccountId(), userId);
        ensureWithinCompetence(request.paymentDate(), year, month);

        Salary salary = findOrCreate(userId, year, month);
        SalaryPayment payment = SalaryPayment.builder()
                .salary(salary)
                .user(entityManager.getReference(User.class, userId))
                .build();
        apply(payment, request);
        paymentRepository.save(payment);
        return toMonthResponse(userId, year, month, salary);
    }

    public SalaryMonthResponse updatePayment(UUID id, SalaryPaymentRequest request) {
        UUID userId = CurrentUser.id();
        SalaryPayment payment = loadOwnedPayment(id, userId);
        Salary salary = payment.getSalary();
        ensureBankAccountBelongsToUser(request.bankAccountId(), userId);
        ensureWithinCompetence(request.paymentDate(), salary.getReferenceYear(), salary.getReferenceMonth());

        apply(payment, request);
        paymentRepository.save(payment);
        return toMonthResponse(userId, salary.getReferenceYear(), salary.getReferenceMonth(), salary);
    }

    public SalaryMonthResponse deletePayment(UUID id) {
        UUID userId = CurrentUser.id();
        SalaryPayment payment = loadOwnedPayment(id, userId);
        Salary salary = payment.getSalary();
        paymentRepository.delete(payment);
        paymentRepository.flush();
        return toMonthResponse(userId, salary.getReferenceYear(), salary.getReferenceMonth(), salary);
    }

    /**
     * Mantem o total previsto do salario igual a NF (INVOICE). Chamado pelo {@link PjEntryService}
     * com a competencia DA NF; {@code amount == null} significa que a NF foi excluida.
     * <p>
     * A NF e do mes trabalhado e o dinheiro entra no mes seguinte (WORK-35, D-8): a NF de
     * setembro preenche o salario de outubro — mesma logica dos impostos do dashboard.
     */
    public void syncExpectedFromInvoice(UUID userId, int invoiceYear, int invoiceMonth, BigDecimal amount) {
        YearMonth salaryMonth = YearMonth.of(invoiceYear, invoiceMonth).plusMonths(1);
        int year = salaryMonth.getYear();
        int month = salaryMonth.getMonthValue();
        if (amount != null) {
            Salary salary = findOrCreate(userId, year, month);
            salary.setExpectedAmount(amount);
            repository.save(salary);
            log.info("Salário {}/{}: total previsto sincronizado pela NF", month, year);
            return;
        }
        repository.findByUserIdAndReferenceYearAndReferenceMonth(userId, year, month).ifPresent(salary -> {
            // Cabecalho que so existia por causa da NF some junto com ela.
            if (salary.getDescription() == null && !paymentRepository.existsBySalaryId(salary.getId())) {
                repository.delete(salary);
            } else {
                salary.setExpectedAmount(null);
                repository.save(salary);
            }
            log.info("Salário {}/{}: NF excluída, total previsto removido", month, year);
        });
    }

    private Salary findOrCreate(UUID userId, int year, int month) {
        return repository.findByUserIdAndReferenceYearAndReferenceMonth(userId, year, month)
                .orElseGet(() -> repository.save(Salary.builder()
                        .user(entityManager.getReference(User.class, userId))
                        .referenceYear(year)
                        .referenceMonth(month)
                        .build()));
    }

    private void apply(SalaryPayment payment, SalaryPaymentRequest request) {
        payment.setBankAccount(entityManager.getReference(BankAccount.class, request.bankAccountId()));
        payment.setPaymentDate(request.paymentDate());
        payment.setAmount(request.amount());
        payment.setDescription(request.description());
    }

    private SalaryMonthResponse toMonthResponse(UUID userId, int year, int month, Salary salary) {
        YearMonth invoiceMonth = YearMonth.of(year, month).minusMonths(1);
        boolean fromInvoice = pjEntryRepository.existsByUserIdAndYearAndMonthAndType(
                userId, invoiceMonth.getYear(), invoiceMonth.getMonthValue(), PjEntryType.INVOICE);
        if (salary == null) {
            return new SalaryMonthResponse(null, year, month, null, fromInvoice,
                    BigDecimal.ZERO, null, null, List.of());
        }

        List<SalaryPaymentResponse> payments = paymentRepository
                .findBySalaryIdOrderByPaymentDateAscCreatedDateAsc(salary.getId()).stream()
                .map(mapper::toPaymentResponse)
                .toList();
        BigDecimal received = payments.stream()
                .map(SalaryPaymentResponse::amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal expected = salary.getExpectedAmount();
        BigDecimal remaining = expected == null ? null : expected.subtract(received);

        return new SalaryMonthResponse(salary.getId(), year, month, expected, fromInvoice,
                received, remaining, salary.getDescription(), payments);
    }

    private void ensureWithinCompetence(LocalDate date, int year, int month) {
        if (!YearMonth.from(date).equals(YearMonth.of(year, month))) {
            throw new SalaryPaymentOutOfCompetenceException(
                    "A data do recebimento deve estar dentro de %02d/%d".formatted(month, year));
        }
    }

    private SalaryPayment loadOwnedPayment(UUID id, UUID userId) {
        return paymentRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Recebimento não encontrado"));
    }

    private void ensureBankAccountBelongsToUser(UUID bankAccountId, UUID userId) {
        bankAccountRepository.findByIdAndUserId(bankAccountId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Conta bancária não encontrada"));
    }
}
