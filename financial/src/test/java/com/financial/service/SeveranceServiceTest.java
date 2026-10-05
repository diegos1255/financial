package com.financial.service;

import com.financial.auth.AuthenticatedUser;
import com.financial.dto.SeveranceResponse;
import com.financial.dto.SeverancePaymentRequest;
import com.financial.exception.PaymentDateInFutureException;
import com.financial.exception.ResourceNotFoundException;
import com.financial.mapper.SeveranceMapperImpl;
import com.financial.model.BankAccount;
import com.financial.model.Severance;
import com.financial.model.SeverancePayment;
import com.financial.model.User;
import com.financial.repository.BankAccountRepository;
import com.financial.repository.SeverancePaymentRepository;
import com.financial.repository.SeveranceRepository;
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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SeveranceServiceTest {

    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID ACCOUNT_ID = UUID.randomUUID();

    @Mock private SeveranceRepository repository;
    @Mock private SeverancePaymentRepository paymentRepository;
    @Mock private BankAccountRepository bankAccountRepository;
    @Mock private EntityManager entityManager;

    private SeveranceService service;

    @BeforeEach
    void setUp() {
        service = new SeveranceService(repository, paymentRepository, bankAccountRepository,
                new SeveranceMapperImpl(), entityManager);

        AuthenticatedUser principal = new AuthenticatedUser(USER_ID, "diego", "x", true);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, List.of()));

        BankAccount account = account();
        when(bankAccountRepository.findByIdAndUserId(ACCOUNT_ID, USER_ID)).thenReturn(Optional.of(account));
        when(entityManager.getReference(BankAccount.class, ACCOUNT_ID)).thenReturn(account);
        when(entityManager.getReference(User.class, USER_ID)).thenReturn(new User());
        when(repository.save(any(Severance.class))).thenAnswer(inv -> {
            Severance s = inv.getArgument(0);
            if (s.getId() == null) s.setId(UUID.randomUUID());
            return s;
        });
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void get_withoutSeverance_returnsEmpty() {
        when(repository.findByUserId(USER_ID)).thenReturn(Optional.empty());

        SeveranceResponse response = service.get();

        assertThat(response.id()).isNull();
        assertThat(response.totalAmount()).isNull();
        assertThat(response.receivedAmount()).isEqualByComparingTo("0");
        assertThat(response.paymentsCount()).isZero();
    }

    @Test
    void get_computesReceivedRemainingAndCount() {
        Severance severance = severance(new BigDecimal("38640.00"));
        when(repository.findByUserId(USER_ID)).thenReturn(Optional.of(severance));
        when(paymentRepository.findBySeveranceIdOrderByPaymentDateAscCreatedDateAsc(severance.getId()))
                .thenReturn(List.of(stored(severance, "2576.12"), stored(severance, "2576.12")));

        SeveranceResponse response = service.get();

        assertThat(response.receivedAmount()).isEqualByComparingTo("5152.24");
        assertThat(response.remainingAmount()).isEqualByComparingTo("33487.76");
        assertThat(response.paymentsCount()).isEqualTo(2);
    }

    @Test
    void get_withoutTotal_hasNullRemaining_andOverpaymentIsNegative() {
        Severance noTotal = severance(null);
        when(repository.findByUserId(USER_ID)).thenReturn(Optional.of(noTotal));
        when(paymentRepository.findBySeveranceIdOrderByPaymentDateAscCreatedDateAsc(noTotal.getId()))
                .thenReturn(List.of(stored(noTotal, "100.00")));
        assertThat(service.get().remainingAmount()).isNull();

        noTotal.setTotalAmount(new BigDecimal("50.00"));
        assertThat(service.get().remainingAmount()).isEqualByComparingTo("-50.00");
    }

    @Test
    void addPayment_today_isAccepted_andCreatesSeveranceOnce() {
        when(repository.findByUserId(USER_ID))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(severance(null)));

        service.addPayment(payment(LocalDate.now()));
        service.addPayment(payment(LocalDate.now().minusMonths(1)));

        verify(paymentRepository, times(2)).save(any(SeverancePayment.class));
        ArgumentCaptor<Severance> created = ArgumentCaptor.forClass(Severance.class);
        verify(repository, times(1)).save(created.capture());
        assertThat(created.getValue().getTotalAmount()).isNull();
    }

    @Test
    void addPayment_inFuture_isRejected() {
        // margem de 2 dias para nao depender do fuso do container
        assertThatThrownBy(() -> service.addPayment(payment(LocalDate.now().plusDays(2))))
                .isInstanceOf(PaymentDateInFutureException.class);
        verify(paymentRepository, never()).save(any());
    }

    @Test
    void addPayment_withAccountOfAnotherUser_isNotFound() {
        SeverancePaymentRequest request = new SeverancePaymentRequest(
                LocalDate.now(), new BigDecimal("1.00"), UUID.randomUUID(), null);

        assertThatThrownBy(() -> service.addPayment(request))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void updatePayment_ofAnotherUser_isNotFound() {
        UUID id = UUID.randomUUID();
        when(paymentRepository.findByIdAndUserId(id, USER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updatePayment(id, payment(LocalDate.now())))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    private static SeverancePaymentRequest payment(LocalDate date) {
        return new SeverancePaymentRequest(date, new BigDecimal("2576.12"), ACCOUNT_ID, null);
    }

    private static Severance severance(BigDecimal total) {
        Severance s = Severance.builder().totalAmount(total).build();
        s.setId(UUID.randomUUID());
        return s;
    }

    private static BankAccount account() {
        BankAccount account = new BankAccount();
        account.setId(ACCOUNT_ID);
        account.setName("Nubank");
        return account;
    }

    private static SeverancePayment stored(Severance severance, String amount) {
        SeverancePayment p = SeverancePayment.builder()
                .severance(severance)
                .bankAccount(account())
                .paymentDate(LocalDate.of(2026, 9, 30))
                .amount(new BigDecimal(amount))
                .build();
        p.setId(UUID.randomUUID());
        return p;
    }
}
