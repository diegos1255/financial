package com.financial.service;

import com.financial.auth.CurrentUser;
import com.financial.dto.BalanceBreakdown;
import com.financial.dto.BalanceResponse;
import com.financial.dto.CategoryExpenseResponse;
import com.financial.dto.MonthEvolutionResponse;
import com.financial.dto.MonthExpenseItemResponse;
import com.financial.model.Expense;
import com.financial.model.Installment;
import com.financial.model.PjEntry;
import com.financial.model.enums.InstallmentStatus;
import com.financial.model.enums.PjEntryType;
import com.financial.repository.DashboardRepository;
import jakarta.persistence.Tuple;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.IntStream;
import java.util.stream.Stream;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    private static final String TAX_COLOR = "#f59e0b"; // amber-500, mesma cor do card Impostos PJ
    private static final Map<PjEntryType, String> TAX_LABELS = Map.of(
            PjEntryType.DAS, "DAS", PjEntryType.INSS, "INSS", PjEntryType.ACCOUNTING, "Contabilidade");
    private static final String[] MONTH_NAMES = {"janeiro", "fevereiro", "março", "abril", "maio", "junho",
            "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"};

    private final DashboardRepository repository;

    public DashboardService(DashboardRepository repository) {
        this.repository = repository;
    }

    public BalanceResponse balance(Integer year, Integer month) {
        return computeBalance(CurrentUser.id(), resolveYearMonth(year, month));
    }

    /** Salario x despesas dos {@code months} meses terminando no mes selecionado, do mais antigo ao mais recente. */
    public List<MonthEvolutionResponse> evolution(Integer year, Integer month, int months) {
        UUID userId = CurrentUser.id();
        YearMonth last = resolveYearMonth(year, month);
        return IntStream.range(0, months)
                .mapToObj(i -> last.minusMonths(months - 1L - i))
                .map(ym -> {
                    BalanceResponse b = computeBalance(userId, ym);
                    return new MonthEvolutionResponse(b.year(), b.month(), b.salary(), b.totalExpenses(), b.pjTaxes(), b.balance());
                })
                .toList();
    }

    /** Itens que compoem o total de despesas do mes (mesmas regras do balanco), maior valor primeiro. */
    public List<MonthExpenseItemResponse> monthExpenses(Integer year, Integer month) {
        UUID userId = CurrentUser.id();
        YearMonth ym = resolveYearMonth(year, month);
        LocalDate startOfMonth = ym.atDay(1);
        LocalDate endOfMonth = ym.atEndOfMonth();

        Stream<MonthExpenseItemResponse> fixed = repository.listFixedExpenses(userId, endOfMonth).stream()
                .map(e -> item(e, null, e.getTotalAmount(), null));
        Stream<MonthExpenseItemResponse> installments = repository.listInstallments(userId, startOfMonth, endOfMonth).stream()
                .map(i -> item(i.getExpense(), installmentDate(i), i.getAmount(),
                        i.getInstallmentNumber() + "/" + i.getExpense().getInstallmentsCount()));
        Stream<MonthExpenseItemResponse> variable = repository.listVariableExpenses(userId, startOfMonth, endOfMonth).stream()
                .map(e -> item(e, e.getPurchaseDate(), e.getTotalAmount(), null));

        YearMonth taxMonth = ym.minusMonths(1);
        String taxRef = " — ref. " + MONTH_NAMES[taxMonth.getMonthValue() - 1];
        Stream<MonthExpenseItemResponse> taxes = repository
                .listPjTaxes(userId, taxMonth.getYear(), taxMonth.getMonthValue()).stream()
                .map(p -> new MonthExpenseItemResponse("PJ_TAX", p.getId(), TAX_LABELS.get(p.getType()) + taxRef,
                        "Impostos PJ", TAX_COLOR, null, null, p.getAmount(), null));

        return Stream.of(fixed, installments, variable, taxes)
                .flatMap(s -> s)
                .sorted(Comparator.comparing(MonthExpenseItemResponse::amount).reversed())
                .toList();
    }

    private BigDecimal sumPjTaxes(UUID userId, YearMonth taxMonth) {
        return repository.listPjTaxes(userId, taxMonth.getYear(), taxMonth.getMonthValue()).stream()
                .map(PjEntry::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static MonthExpenseItemResponse item(Expense e, LocalDate date, BigDecimal amount, String installmentLabel) {
        return new MonthExpenseItemResponse("EXPENSE", e.getId(), e.getDescription(), e.getCategory().getName(),
                e.getCategory().getColor(), e.getExpenseType(), date, amount, installmentLabel);
    }

    // Parcela antecipada conta no mes em que foi paga (mesma regra de sumInstallments).
    private static LocalDate installmentDate(Installment i) {
        return i.getStatus() == InstallmentStatus.ANTICIPATED && i.getPaidAt() != null
                ? i.getPaidAt().toLocalDate()
                : i.getDueDate();
    }

    private BalanceResponse computeBalance(UUID userId, YearMonth ym) {
        LocalDate startOfMonth = ym.atDay(1);
        LocalDate endOfMonth = ym.atEndOfMonth();

        BigDecimal salary = repository.sumSalary(userId, ym.getYear(), ym.getMonthValue());
        BigDecimal fixed = repository.sumFixedExpenses(userId, endOfMonth);
        BigDecimal installments = repository.sumInstallments(userId, startOfMonth, endOfMonth);
        BigDecimal installmentsPaid = repository.sumInstallmentsPaid(userId, startOfMonth, endOfMonth);
        BigDecimal installmentsPending = repository.sumInstallmentsPending(userId, startOfMonth, endOfMonth);
        BigDecimal variable = repository.sumVariableExpenses(userId, startOfMonth, endOfMonth);
        BigDecimal totalExpenses = fixed.add(installments).add(variable);
        // Salario vem do bruto da NF: os impostos dessa NF (mes anterior) saem do saldo (WORK-35, D-9).
        BigDecimal pjTaxes = sumPjTaxes(userId, ym.minusMonths(1));
        BigDecimal balance = salary.subtract(totalExpenses).subtract(pjTaxes);

        return new BalanceResponse(
                ym.getYear(),
                ym.getMonthValue(),
                salary,
                totalExpenses,
                pjTaxes,
                balance,
                new BalanceBreakdown(fixed, installments, installmentsPaid, installmentsPending, variable)
        );
    }

    public List<CategoryExpenseResponse> expensesByCategory(Integer year, Integer month) {
        YearMonth ym = resolveYearMonth(year, month);
        LocalDate startOfMonth = ym.atDay(1);
        LocalDate endOfMonth = ym.atEndOfMonth();
        UUID userId = CurrentUser.id();

        Map<UUID, CategoryExpenseResponse> merged = new LinkedHashMap<>();
        accumulate(merged, repository.sumFixedExpensesByCategory(userId, endOfMonth));
        accumulate(merged, repository.sumInstallmentsByCategory(userId, startOfMonth, endOfMonth));
        accumulate(merged, repository.sumVariableExpensesByCategory(userId, startOfMonth, endOfMonth));

        return merged.values().stream()
                .sorted(Comparator.comparing(CategoryExpenseResponse::total).reversed())
                .toList();
    }

    private static void accumulate(Map<UUID, CategoryExpenseResponse> merged, List<Tuple> rows) {
        for (Tuple t : rows) {
            UUID categoryId = t.get("categoryId", UUID.class);
            String categoryName = t.get("categoryName", String.class);
            String color = t.get("color", String.class);
            BigDecimal total = t.get("total", BigDecimal.class);
            merged.merge(
                    categoryId,
                    new CategoryExpenseResponse(categoryId, categoryName, color, total),
                    (existing, incoming) -> new CategoryExpenseResponse(
                            existing.categoryId(),
                            existing.categoryName(),
                            existing.color() != null ? existing.color() : incoming.color(),
                            existing.total().add(incoming.total())));
        }
    }

    private static YearMonth resolveYearMonth(Integer year, Integer month) {
        if (year == null || month == null) {
            return YearMonth.now();
        }
        return YearMonth.of(year, month);
    }
}
