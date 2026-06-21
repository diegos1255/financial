package com.financial.model;

import com.financial.model.enums.ExpenseStatus;
import com.financial.model.enums.ExpenseType;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Check;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "expenses",
        indexes = {
                @Index(name = "idx_expenses_user_status", columnList = "user_id, status"),
                @Index(name = "idx_expenses_user_category", columnList = "user_id, category_id"),
                @Index(name = "idx_expenses_user_purchase_date", columnList = "user_id, purchase_date")
        }
)
@Check(constraints =
        "total_amount >= 0 " +
        "AND (installments_count IS NULL OR installments_count >= 1) " +
        "AND (" +
        "  (expense_type = 'FIXED' AND installments_count IS NULL AND first_due_date IS NULL) " +
        "  OR (expense_type = 'INSTALLMENT' AND installments_count IS NOT NULL AND first_due_date IS NOT NULL AND first_due_date >= purchase_date) " +
        "  OR (expense_type = 'VARIABLE' AND installments_count IS NULL AND first_due_date IS NULL) " +
        ") " +
        "AND (status = 'ACTIVE' AND cancelled_at IS NULL " +
        "     OR status = 'CANCELLED' AND cancelled_at IS NOT NULL)"
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Expense extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bank_account_id", nullable = false)
    private BankAccount bankAccount;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private ExpenseCategory category;

    @Column(name = "description", nullable = false, length = 200)
    private String description;

    @Column(name = "total_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "expense_type", nullable = false, length = 20)
    private ExpenseType expenseType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ExpenseStatus status;

    @Column(name = "purchase_date", nullable = false)
    private LocalDate purchaseDate;

    @Column(name = "first_due_date")
    private LocalDate firstDueDate;

    @Column(name = "installments_count")
    private Integer installmentsCount;

    @Column(name = "cancelled_at")
    private OffsetDateTime cancelledAt;

    @OneToMany(
            mappedBy = "expense",
            cascade = CascadeType.ALL,
            orphanRemoval = false,
            fetch = FetchType.LAZY
    )
    @Builder.Default
    private List<Installment> installments = new ArrayList<>();
}
