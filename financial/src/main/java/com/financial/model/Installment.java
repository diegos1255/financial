package com.financial.model;

import com.financial.model.enums.InstallmentStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Check;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(
        name = "installments",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_installments_expense_number",
                columnNames = {"expense_id", "installment_number"}
        )
)
@Check(constraints =
        "installment_number >= 1 " +
        "AND amount >= 0 " +
        "AND ((status IN ('PAID','ANTICIPATED') AND paid_at IS NOT NULL) " +
        "     OR (status IN ('PENDING','CANCELLED') AND paid_at IS NULL))"
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Installment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "expense_id", nullable = false)
    private Expense expense;

    @Column(name = "installment_number", nullable = false)
    private Integer installmentNumber;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private InstallmentStatus status;

    @Column(name = "paid_at")
    private OffsetDateTime paidAt;
}
