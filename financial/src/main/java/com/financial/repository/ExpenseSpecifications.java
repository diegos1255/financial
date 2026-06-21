package com.financial.repository;

import com.financial.model.Expense;
import com.financial.model.Installment;
import com.financial.model.enums.ExpenseStatus;
import com.financial.model.enums.ExpenseType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.UUID;

public final class ExpenseSpecifications {

    private ExpenseSpecifications() {}

    public static Specification<Expense> byUserId(UUID userId) {
        return (root, query, cb) -> cb.equal(root.get("user").get("id"), userId);
    }

    public static Specification<Expense> byStatus(ExpenseStatus status) {
        return (root, query, cb) -> status == null ? cb.conjunction() : cb.equal(root.get("status"), status);
    }

    public static Specification<Expense> byCategoryId(UUID categoryId) {
        return (root, query, cb) -> categoryId == null ? cb.conjunction()
                : cb.equal(root.get("category").get("id"), categoryId);
    }

    public static Specification<Expense> byBankAccountId(UUID bankAccountId) {
        return (root, query, cb) -> bankAccountId == null ? cb.conjunction()
                : cb.equal(root.get("bankAccount").get("id"), bankAccountId);
    }

    public static Specification<Expense> inReferenceMonth(LocalDate startOfMonth, LocalDate endOfMonth) {
        return (root, query, cb) -> {
            if (startOfMonth == null || endOfMonth == null) {
                return cb.conjunction();
            }
            Predicate fixedActive = cb.and(
                    cb.equal(root.get("expenseType"), ExpenseType.FIXED),
                    cb.lessThanOrEqualTo(root.<LocalDate>get("purchaseDate"), endOfMonth)
            );
            Subquery<Long> sub = query.subquery(Long.class);
            Root<Installment> inst = sub.from(Installment.class);
            sub.select(cb.literal(1L)).where(
                    cb.equal(inst.get("expense"), root),
                    cb.between(inst.<LocalDate>get("dueDate"), startOfMonth, endOfMonth)
            );
            Predicate variableInMonth = cb.and(
                    cb.equal(root.get("expenseType"), ExpenseType.VARIABLE),
                    cb.between(root.<LocalDate>get("purchaseDate"), startOfMonth, endOfMonth)
            );
            return cb.or(fixedActive, cb.exists(sub), variableInMonth);
        };
    }
}
