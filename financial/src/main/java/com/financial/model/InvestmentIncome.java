package com.financial.model;

import com.financial.model.enums.InvestmentDataSource;
import com.financial.model.enums.InvestmentIncomeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
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

/** Provento recebido (rendimento, dividendo, JCP...) — WORK-36. */
@Entity
@Table(
        name = "investment_incomes",
        uniqueConstraints = @UniqueConstraint(name = "uk_inv_income_user_external", columnNames = {"user_id", "external_key"}),
        indexes = @Index(name = "idx_inv_income_user_date", columnList = "user_id, payment_date")
)
@Check(constraints = "amount > 0")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvestmentIncome extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "investment_id", nullable = false)
    private Investment investment;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 12)
    private InvestmentIncomeType type;

    @Column(name = "payment_date", nullable = false)
    private LocalDate paymentDate;

    // Cotas que geraram o provento (informativo; preenchido no modo "por cota").
    @Column(name = "quantity")
    private Integer quantity;

    @Column(name = "unit_value", precision = 14, scale = 6)
    private BigDecimal unitValue;

    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 10)
    private InvestmentDataSource source;

    @Column(name = "external_key", length = 64)
    private String externalKey;
}
