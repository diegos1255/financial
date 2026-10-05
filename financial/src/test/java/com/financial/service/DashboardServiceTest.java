package com.financial.service;

import com.financial.auth.AuthenticatedUser;
import com.financial.dto.MonthEvolutionResponse;
import com.financial.dto.MonthExpenseItemResponse;
import com.financial.model.Expense;
import com.financial.model.ExpenseCategory;
import com.financial.model.Installment;
import com.financial.model.enums.ExpenseType;
import com.financial.model.enums.InstallmentStatus;
import com.financial.repository.DashboardRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

class DashboardServiceTest {

    private static final UUID USER_ID = UUID.randomUUID();

    private DashboardRepository repository;
    private DashboardService service;

    @BeforeEach
    void setUp() {
        // Toda soma do repositorio devolve ZERO por padrao (Mockito devolveria null).
        repository = Mockito.mock(DashboardRepository.class, inv ->
                inv.getMethod().getReturnType() == BigDecimal.class
                        ? BigDecimal.ZERO
                        : Mockito.RETURNS_DEFAULTS.answer(inv));
        service = new DashboardService(repository);
        AuthenticatedUser principal = new AuthenticatedUser(USER_ID, "diego", "x", true);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, List.of()));
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void evolution_returnsMonthsChronologicallyEndingAtSelected() {
        List<MonthEvolutionResponse> result = service.evolution(2026, 10, 6);

        assertThat(result).extracting(MonthEvolutionResponse::month).containsExactly(5, 6, 7, 8, 9, 10);
        assertThat(result).extracting(MonthEvolutionResponse::year).containsOnly(2026);
    }

    @Test
    void evolution_crossesYearBoundary() {
        List<MonthEvolutionResponse> result = service.evolution(2027, 1, 6);

        assertThat(result).extracting(r -> r.year() + "-" + r.month())
                .containsExactly("2026-8", "2026-9", "2026-10", "2026-11", "2026-12", "2027-1");
    }

    @Test
    void evolution_usesSameRulesAsBalance() {
        when(repository.sumSalary(eq(USER_ID), eq(2026), eq(10))).thenReturn(new BigDecimal("15000.00"));
        when(repository.sumFixedExpenses(eq(USER_ID), any())).thenReturn(new BigDecimal("4000.00"));

        MonthEvolutionResponse october = service.evolution(2026, 10, 1).getFirst();

        assertThat(october.salary()).isEqualByComparingTo("15000.00");
        assertThat(october.totalExpenses()).isEqualByComparingTo("4000.00");
        assertThat(october.balance()).isEqualByComparingTo("11000.00");
        assertThat(service.balance(2026, 10).balance()).isEqualByComparingTo(october.balance());
    }

    @Test
    void monthExpenses_mergesTypesSortedByAmountDesc() {
        Expense fixed = expense("Aluguel", ExpenseType.FIXED, "1500.00", null);
        Expense parcelled = expense("Notebook", ExpenseType.INSTALLMENT, "3000.00", 10);
        Expense variable = expense("Mercado", ExpenseType.VARIABLE, "420.50", null);
        variable.setPurchaseDate(LocalDate.of(2026, 10, 12));

        Installment normal = installment(parcelled, 3, "300.00", InstallmentStatus.PENDING, LocalDate.of(2026, 10, 15), null);
        Installment anticipated = installment(parcelled, 9, "300.00", InstallmentStatus.ANTICIPATED,
                LocalDate.of(2027, 4, 15), OffsetDateTime.of(2026, 10, 20, 10, 0, 0, 0, ZoneOffset.UTC));

        when(repository.listFixedExpenses(eq(USER_ID), any())).thenReturn(List.of(fixed));
        when(repository.listInstallments(eq(USER_ID), any(), any())).thenReturn(List.of(normal, anticipated));
        when(repository.listVariableExpenses(eq(USER_ID), any(), any())).thenReturn(List.of(variable));

        List<MonthExpenseItemResponse> items = service.monthExpenses(2026, 10);

        assertThat(items).extracting(MonthExpenseItemResponse::description)
                .containsExactly("Aluguel", "Mercado", "Notebook", "Notebook");
        assertThat(items.get(0).date()).isNull();
        assertThat(items.get(1).date()).isEqualTo(LocalDate.of(2026, 10, 12));
        assertThat(items).filteredOn(i -> "9/10".equals(i.installmentLabel()))
                .singleElement()
                .extracting(MonthExpenseItemResponse::date)
                .isEqualTo(LocalDate.of(2026, 10, 20));
        assertThat(items).filteredOn(i -> "3/10".equals(i.installmentLabel()))
                .singleElement()
                .extracting(MonthExpenseItemResponse::amount)
                .isEqualTo(new BigDecimal("300.00"));
    }

    private static Expense expense(String description, ExpenseType type, String amount, Integer installments) {
        ExpenseCategory category = new ExpenseCategory();
        category.setName("Categoria");
        category.setColor("#ef4444");
        Expense e = new Expense();
        e.setId(UUID.randomUUID());
        e.setDescription(description);
        e.setExpenseType(type);
        e.setTotalAmount(new BigDecimal(amount));
        e.setInstallmentsCount(installments);
        e.setPurchaseDate(LocalDate.of(2026, 1, 5));
        e.setCategory(category);
        return e;
    }

    private static Installment installment(Expense expense, int number, String amount, InstallmentStatus status,
                                           LocalDate due, OffsetDateTime paidAt) {
        Installment i = new Installment();
        i.setExpense(expense);
        i.setInstallmentNumber(number);
        i.setAmount(new BigDecimal(amount));
        i.setStatus(status);
        i.setDueDate(due);
        i.setPaidAt(paidAt);
        return i;
    }
}
