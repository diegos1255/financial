package com.financial.service;

import com.financial.auth.AuthenticatedUser;
import com.financial.dto.SalaryMonthResponse;
import com.financial.dto.SalaryPaymentRequest;
import com.financial.exception.ResourceNotFoundException;
import com.financial.exception.SalaryPaymentOutOfCompetenceException;
import com.financial.mapper.SalaryMapperImpl;
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
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SalaryServiceTest {

    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID ACCOUNT_ID = UUID.randomUUID();

    @Mock private SalaryRepository repository;
    @Mock private SalaryPaymentRepository paymentRepository;
    @Mock private BankAccountRepository bankAccountRepository;
    @Mock private PjEntryRepository pjEntryRepository;
    @Mock private EntityManager entityManager;

    private SalaryService service;

    @BeforeEach
    void setUp() {
        service = new SalaryService(repository, paymentRepository, bankAccountRepository,
                pjEntryRepository, new SalaryMapperImpl(), entityManager);

        AuthenticatedUser principal = new AuthenticatedUser(USER_ID, "diego", "x", true);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, List.of()));

        BankAccount account = new BankAccount();
        account.setId(ACCOUNT_ID);
        account.setName("Itaú");
        when(bankAccountRepository.findByIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.of(account));
        when(entityManager.getReference(BankAccount.class, ACCOUNT_ID)).thenReturn(account);
        when(entityManager.getReference(User.class, USER_ID)).thenReturn(new User());
        when(repository.save(any(Salary.class))).thenAnswer(inv -> {
            Salary s = inv.getArgument(0);
            if (s.getId() == null) s.setId(UUID.randomUUID());
            return s;
        });
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void addPayment_onFirstAndLastDayOfCompetence_isAccepted() {
        when(repository.findByUserIdAndReferenceYearAndReferenceMonth(USER_ID, 2026, 10)).thenReturn(Optional.empty());

        service.addPayment(2026, 10, payment(LocalDate.of(2026, 10, 1), "100.00"));
        service.addPayment(2026, 10, payment(LocalDate.of(2026, 10, 31), "100.00"));

        verify(paymentRepository, times(2)).save(any(SalaryPayment.class));
    }

    @Test
    void addPayment_outsideCompetence_isRejected() {
        assertThatThrownBy(() -> service.addPayment(2026, 10, payment(LocalDate.of(2026, 9, 30), "100.00")))
                .isInstanceOf(SalaryPaymentOutOfCompetenceException.class);
        assertThatThrownBy(() -> service.addPayment(2026, 10, payment(LocalDate.of(2026, 11, 1), "100.00")))
                .isInstanceOf(SalaryPaymentOutOfCompetenceException.class);
        verify(paymentRepository, never()).save(any());
    }

    @Test
    void addPayment_createsHeaderOnlyWhenMissing() {
        Salary existing = salary(new BigDecimal("20000.00"));
        when(repository.findByUserIdAndReferenceYearAndReferenceMonth(USER_ID, 2026, 10))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(existing));

        service.addPayment(2026, 10, payment(LocalDate.of(2026, 10, 5), "8000.00"));
        service.addPayment(2026, 10, payment(LocalDate.of(2026, 10, 15), "7000.00"));

        ArgumentCaptor<Salary> created = ArgumentCaptor.forClass(Salary.class);
        verify(repository, times(1)).save(created.capture());
        assertThat(created.getValue().getReferenceMonth()).isEqualTo(10);
        assertThat(created.getValue().getExpectedAmount()).isNull();
    }

    @Test
    void addPayment_withAccountOfAnotherUser_isNotFound() {
        UUID foreign = UUID.randomUUID();
        SalaryPaymentRequest request = new SalaryPaymentRequest(
                LocalDate.of(2026, 10, 5), new BigDecimal("1.00"), foreign, null);

        assertThatThrownBy(() -> service.addPayment(2026, 10, request))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getMonth_computesReceivedAndRemaining() {
        Salary salary = salary(new BigDecimal("20000.00"));
        when(repository.findByUserIdAndReferenceYearAndReferenceMonth(USER_ID, 2026, 10)).thenReturn(Optional.of(salary));
        when(paymentRepository.findBySalaryIdOrderByPaymentDateAscCreatedDateAsc(salary.getId()))
                .thenReturn(List.of(storedPayment(salary, "8000.00"), storedPayment(salary, "7000.00")));
        // Salario de outubro vem da NF de setembro (mes trabalhado).
        when(pjEntryRepository.existsByUserIdAndYearAndMonthAndType(USER_ID, 2026, 9, PjEntryType.INVOICE))
                .thenReturn(true);

        SalaryMonthResponse month = service.getMonth(2026, 10);

        assertThat(month.receivedAmount()).isEqualByComparingTo("15000.00");
        assertThat(month.remainingAmount()).isEqualByComparingTo("5000.00");
        assertThat(month.expectedFromInvoice()).isTrue();
        assertThat(month.payments()).hasSize(2);
    }

    @Test
    void getMonth_withoutExpected_hasNullRemaining_andOverpaymentIsNegative() {
        Salary noTotal = salary(null);
        when(repository.findByUserIdAndReferenceYearAndReferenceMonth(USER_ID, 2026, 10)).thenReturn(Optional.of(noTotal));
        when(paymentRepository.findBySalaryIdOrderByPaymentDateAscCreatedDateAsc(noTotal.getId()))
                .thenReturn(List.of(storedPayment(noTotal, "500.00")));
        assertThat(service.getMonth(2026, 10).remainingAmount()).isNull();

        Salary small = salary(new BigDecimal("100.00"));
        when(repository.findByUserIdAndReferenceYearAndReferenceMonth(USER_ID, 2026, 11)).thenReturn(Optional.of(small));
        when(paymentRepository.findBySalaryIdOrderByPaymentDateAscCreatedDateAsc(small.getId()))
                .thenReturn(List.of(storedPayment(small, "150.00")));
        assertThat(service.getMonth(2026, 11).remainingAmount()).isEqualByComparingTo("-50.00");
    }

    @Test
    void getMonth_withoutHeader_returnsEmptyMonth() {
        when(repository.findByUserIdAndReferenceYearAndReferenceMonth(USER_ID, 2026, 10)).thenReturn(Optional.empty());

        SalaryMonthResponse month = service.getMonth(2026, 10);

        assertThat(month.id()).isNull();
        assertThat(month.expectedAmount()).isNull();
        assertThat(month.receivedAmount()).isEqualByComparingTo("0");
        assertThat(month.payments()).isEmpty();
    }

    @Test
    void syncFromInvoice_fillsTheFollowingMonth() {
        when(repository.findByUserIdAndReferenceYearAndReferenceMonth(USER_ID, 2026, 10)).thenReturn(Optional.empty());

        // NF de setembro -> salario de outubro
        service.syncExpectedFromInvoice(USER_ID, 2026, 9, new BigDecimal("16000.00"));

        ArgumentCaptor<Salary> saved = ArgumentCaptor.forClass(Salary.class);
        verify(repository, atLeastOnce()).save(saved.capture());
        assertThat(saved.getValue().getReferenceYear()).isEqualTo(2026);
        assertThat(saved.getValue().getReferenceMonth()).isEqualTo(10);
        assertThat(saved.getValue().getExpectedAmount()).isEqualByComparingTo("16000.00");
    }

    @Test
    void syncFromInvoice_decemberFillsJanuaryOfNextYear() {
        when(repository.findByUserIdAndReferenceYearAndReferenceMonth(USER_ID, 2027, 1)).thenReturn(Optional.empty());

        service.syncExpectedFromInvoice(USER_ID, 2026, 12, new BigDecimal("16000.00"));

        ArgumentCaptor<Salary> saved = ArgumentCaptor.forClass(Salary.class);
        verify(repository, atLeastOnce()).save(saved.capture());
        assertThat(saved.getValue().getReferenceYear()).isEqualTo(2027);
        assertThat(saved.getValue().getReferenceMonth()).isEqualTo(1);
    }

    @Test
    void syncFromInvoice_removed_withoutPayments_deletesHeader() {
        Salary salary = salary(new BigDecimal("16000.00"));
        when(repository.findByUserIdAndReferenceYearAndReferenceMonth(USER_ID, 2026, 10)).thenReturn(Optional.of(salary));
        when(paymentRepository.existsBySalaryId(salary.getId())).thenReturn(false);

        service.syncExpectedFromInvoice(USER_ID, 2026, 9, null);

        verify(repository).delete(salary);
    }

    @Test
    void syncFromInvoice_removed_withPayments_onlyClearsExpected() {
        Salary salary = salary(new BigDecimal("16000.00"));
        when(repository.findByUserIdAndReferenceYearAndReferenceMonth(USER_ID, 2026, 10)).thenReturn(Optional.of(salary));
        when(paymentRepository.existsBySalaryId(salary.getId())).thenReturn(true);

        service.syncExpectedFromInvoice(USER_ID, 2026, 9, null);

        verify(repository, never()).delete(any());
        assertThat(salary.getExpectedAmount()).isNull();
    }

    @Test
    void syncFromInvoice_removed_withoutHeader_doesNothing() {
        when(repository.findByUserIdAndReferenceYearAndReferenceMonth(eq(USER_ID), anyInt(), anyInt()))
                .thenReturn(Optional.empty());

        service.syncExpectedFromInvoice(USER_ID, 2026, 9, null);

        verify(repository, never()).save(any());
        verify(repository, never()).delete(any());
    }

    private static SalaryPaymentRequest payment(LocalDate date, String amount) {
        return new SalaryPaymentRequest(date, new BigDecimal(amount), ACCOUNT_ID, null);
    }

    private static Salary salary(BigDecimal expected) {
        Salary s = Salary.builder().referenceYear(2026).referenceMonth(10).expectedAmount(expected).build();
        s.setId(UUID.randomUUID());
        return s;
    }

    private static SalaryPayment storedPayment(Salary salary, String amount) {
        BankAccount account = new BankAccount();
        account.setId(ACCOUNT_ID);
        account.setName("Itaú");
        SalaryPayment p = SalaryPayment.builder()
                .salary(salary)
                .bankAccount(account)
                .paymentDate(LocalDate.of(2026, 10, 5))
                .amount(new BigDecimal(amount))
                .build();
        p.setId(UUID.randomUUID());
        return p;
    }
}
