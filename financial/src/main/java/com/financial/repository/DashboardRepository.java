package com.financial.repository;

import com.financial.model.enums.ExpenseStatus;
import com.financial.model.enums.ExpenseType;
import com.financial.model.enums.InstallmentStatus;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Tuple;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public class DashboardRepository {

    private final EntityManager em;

    public DashboardRepository(EntityManager em) {
        this.em = em;
    }

    public BigDecimal sumSalary(UUID userId, int year, int month) {
        BigDecimal result = em.createQuery("""
                        SELECT COALESCE(SUM(s.amount), 0)
                          FROM Salary s
                         WHERE s.user.id = :userId
                           AND s.referenceYear = :year
                           AND s.referenceMonth = :month
                        """, BigDecimal.class)
                .setParameter("userId", userId)
                .setParameter("year", year)
                .setParameter("month", month)
                .getSingleResult();
        return result == null ? BigDecimal.ZERO : result;
    }

    public BigDecimal sumFixedExpenses(UUID userId, LocalDate endOfMonth) {
        BigDecimal result = em.createQuery("""
                        SELECT COALESCE(SUM(e.totalAmount), 0)
                          FROM Expense e
                         WHERE e.user.id = :userId
                           AND e.expenseType = :fixed
                           AND e.status = :active
                           AND e.purchaseDate <= :endOfMonth
                        """, BigDecimal.class)
                .setParameter("userId", userId)
                .setParameter("fixed", ExpenseType.FIXED)
                .setParameter("active", ExpenseStatus.ACTIVE)
                .setParameter("endOfMonth", endOfMonth)
                .getSingleResult();
        return result == null ? BigDecimal.ZERO : result;
    }

    // Total de parcelas do mês: PENDING/PAID com dueDate no mês + ANTICIPATED com paidAt no mês
    public BigDecimal sumInstallments(UUID userId, LocalDate startOfMonth, LocalDate endOfMonth) {
        BigDecimal result = em.createQuery("""
                        SELECT COALESCE(SUM(i.amount), 0)
                          FROM Installment i
                         WHERE i.expense.user.id = :userId
                           AND (
                             (i.status IN :pendingPaid AND i.dueDate BETWEEN :startOfMonth AND :endOfMonth)
                             OR
                             (i.status = :anticipated AND CAST(i.paidAt AS LocalDate) BETWEEN :startOfMonth AND :endOfMonth)
                           )
                        """, BigDecimal.class)
                .setParameter("userId", userId)
                .setParameter("pendingPaid", List.of(InstallmentStatus.PENDING, InstallmentStatus.PAID))
                .setParameter("anticipated", InstallmentStatus.ANTICIPATED)
                .setParameter("startOfMonth", startOfMonth)
                .setParameter("endOfMonth", endOfMonth)
                .getSingleResult();
        return result == null ? BigDecimal.ZERO : result;
    }

    // Parcelas efetivamente pagas no mês: PAID com dueDate no mês + ANTICIPATED com paidAt no mês
    public BigDecimal sumInstallmentsPaid(UUID userId, LocalDate startOfMonth, LocalDate endOfMonth) {
        BigDecimal result = em.createQuery("""
                        SELECT COALESCE(SUM(i.amount), 0)
                          FROM Installment i
                         WHERE i.expense.user.id = :userId
                           AND (
                             (i.status = :paid AND i.dueDate BETWEEN :startOfMonth AND :endOfMonth)
                             OR
                             (i.status = :anticipated AND CAST(i.paidAt AS LocalDate) BETWEEN :startOfMonth AND :endOfMonth)
                           )
                        """, BigDecimal.class)
                .setParameter("userId", userId)
                .setParameter("paid", InstallmentStatus.PAID)
                .setParameter("anticipated", InstallmentStatus.ANTICIPATED)
                .setParameter("startOfMonth", startOfMonth)
                .setParameter("endOfMonth", endOfMonth)
                .getSingleResult();
        return result == null ? BigDecimal.ZERO : result;
    }

    // Parcelas ainda pendentes no mês: PENDING com dueDate no mês
    public BigDecimal sumInstallmentsPending(UUID userId, LocalDate startOfMonth, LocalDate endOfMonth) {
        BigDecimal result = em.createQuery("""
                        SELECT COALESCE(SUM(i.amount), 0)
                          FROM Installment i
                         WHERE i.expense.user.id = :userId
                           AND i.status = :pending
                           AND i.dueDate BETWEEN :startOfMonth AND :endOfMonth
                        """, BigDecimal.class)
                .setParameter("userId", userId)
                .setParameter("pending", InstallmentStatus.PENDING)
                .setParameter("startOfMonth", startOfMonth)
                .setParameter("endOfMonth", endOfMonth)
                .getSingleResult();
        return result == null ? BigDecimal.ZERO : result;
    }

    public List<Tuple> sumFixedExpensesByCategory(UUID userId, LocalDate endOfMonth) {
        return em.createQuery("""
                        SELECT e.category.id AS categoryId,
                               e.category.name AS categoryName,
                               e.category.color AS color,
                               COALESCE(SUM(e.totalAmount), 0) AS total
                          FROM Expense e
                         WHERE e.user.id = :userId
                           AND e.expenseType = :fixed
                           AND e.status = :active
                           AND e.purchaseDate <= :endOfMonth
                         GROUP BY e.category.id, e.category.name, e.category.color
                        """, Tuple.class)
                .setParameter("userId", userId)
                .setParameter("fixed", ExpenseType.FIXED)
                .setParameter("active", ExpenseStatus.ACTIVE)
                .setParameter("endOfMonth", endOfMonth)
                .getResultList();
    }

    public List<Tuple> sumInstallmentsByCategory(UUID userId, LocalDate startOfMonth, LocalDate endOfMonth) {
        return em.createQuery("""
                        SELECT i.expense.category.id AS categoryId,
                               i.expense.category.name AS categoryName,
                               i.expense.category.color AS color,
                               COALESCE(SUM(i.amount), 0) AS total
                          FROM Installment i
                         WHERE i.expense.user.id = :userId
                           AND (
                             (i.status IN :pendingPaid AND i.dueDate BETWEEN :startOfMonth AND :endOfMonth)
                             OR
                             (i.status = :anticipated AND CAST(i.paidAt AS LocalDate) BETWEEN :startOfMonth AND :endOfMonth)
                           )
                         GROUP BY i.expense.category.id, i.expense.category.name, i.expense.category.color
                        """, Tuple.class)
                .setParameter("userId", userId)
                .setParameter("pendingPaid", List.of(InstallmentStatus.PENDING, InstallmentStatus.PAID))
                .setParameter("anticipated", InstallmentStatus.ANTICIPATED)
                .setParameter("startOfMonth", startOfMonth)
                .setParameter("endOfMonth", endOfMonth)
                .getResultList();
    }

    public BigDecimal sumVariableExpenses(UUID userId, LocalDate startOfMonth, LocalDate endOfMonth) {
        BigDecimal result = em.createQuery("""
                        SELECT COALESCE(SUM(e.totalAmount), 0)
                          FROM Expense e
                         WHERE e.user.id = :userId
                           AND e.expenseType = :variable
                           AND e.status = :active
                           AND e.purchaseDate BETWEEN :startOfMonth AND :endOfMonth
                        """, BigDecimal.class)
                .setParameter("userId", userId)
                .setParameter("variable", ExpenseType.VARIABLE)
                .setParameter("active", ExpenseStatus.ACTIVE)
                .setParameter("startOfMonth", startOfMonth)
                .setParameter("endOfMonth", endOfMonth)
                .getSingleResult();
        return result == null ? BigDecimal.ZERO : result;
    }

    public List<Tuple> sumVariableExpensesByCategory(UUID userId, LocalDate startOfMonth, LocalDate endOfMonth) {
        return em.createQuery("""
                        SELECT e.category.id AS categoryId,
                               e.category.name AS categoryName,
                               e.category.color AS color,
                               COALESCE(SUM(e.totalAmount), 0) AS total
                          FROM Expense e
                         WHERE e.user.id = :userId
                           AND e.expenseType = :variable
                           AND e.status = :active
                           AND e.purchaseDate BETWEEN :startOfMonth AND :endOfMonth
                         GROUP BY e.category.id, e.category.name, e.category.color
                        """, Tuple.class)
                .setParameter("userId", userId)
                .setParameter("variable", ExpenseType.VARIABLE)
                .setParameter("active", ExpenseStatus.ACTIVE)
                .setParameter("startOfMonth", startOfMonth)
                .setParameter("endOfMonth", endOfMonth)
                .getResultList();
    }
}
