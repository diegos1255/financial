package com.financial.service;

import com.financial.auth.AuthenticatedUser;
import com.financial.exception.ExpenseCancellationException;
import com.financial.mapper.ExpenseMapper;
import com.financial.model.Expense;
import com.financial.model.enums.ExpenseStatus;
import com.financial.repository.BankAccountRepository;
import com.financial.repository.ExpenseCategoryRepository;
import com.financial.repository.ExpenseRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ExpenseServiceTest {

    private static final UUID USER_ID = UUID.randomUUID();

    @Mock private ExpenseRepository repository;
    @Mock private ExpenseCategoryRepository categoryRepository;
    @Mock private BankAccountRepository bankAccountRepository;
    @Mock private InstallmentService installmentService;
    @Mock private ExpenseMapper mapper;
    @Mock private EntityManager entityManager;

    private ExpenseService service;

    @BeforeEach
    void setUp() {
        service = new ExpenseService(repository, categoryRepository, bankAccountRepository,
                installmentService, mapper, entityManager);
        AuthenticatedUser principal = new AuthenticatedUser(USER_ID, "diego", "x", true);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, List.of()));
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void cancel_storesTrimmedReasonAndDate() {
        Expense expense = new Expense();
        expense.setId(UUID.randomUUID());
        expense.setStatus(ExpenseStatus.ACTIVE);
        when(repository.findByIdAndUserId(expense.getId(), USER_ID)).thenReturn(Optional.of(expense));

        service.cancel(expense.getId(), "  Troquei de plano de celular  ");

        assertThat(expense.getStatus()).isEqualTo(ExpenseStatus.CANCELLED);
        assertThat(expense.getCancellationReason()).isEqualTo("Troquei de plano de celular");
        assertThat(expense.getCancelledAt()).isNotNull();
        verify(installmentService).cancelPendingFor(expense);
    }

    @Test
    void cancel_alreadyCancelled_isRejected() {
        Expense expense = new Expense();
        expense.setId(UUID.randomUUID());
        expense.setStatus(ExpenseStatus.CANCELLED);
        when(repository.findByIdAndUserId(expense.getId(), USER_ID)).thenReturn(Optional.of(expense));

        assertThatThrownBy(() -> service.cancel(expense.getId(), "motivo"))
                .isInstanceOf(ExpenseCancellationException.class);
        verify(repository, never()).save(any());
    }
}
