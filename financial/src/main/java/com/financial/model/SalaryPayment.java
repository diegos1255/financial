package com.financial.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Check;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Recebimento parcial do salario de uma competencia. A data sempre cai
 * dentro do mes/ano do {@link Salary} (validado no service).
 */
@Entity
@Table(
        name = "salary_payments",
        indexes = {
                @Index(name = "idx_salary_payments_salary", columnList = "salary_id"),
                @Index(name = "idx_salary_payments_user_date", columnList = "user_id, payment_date")
        }
)
@Check(constraints = "amount > 0")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SalaryPayment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "salary_id", nullable = false)
    private Salary salary;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bank_account_id", nullable = false)
    private BankAccount bankAccount;

    @Column(name = "payment_date", nullable = false)
    private LocalDate paymentDate;

    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "description", length = 255)
    private String description;
}
