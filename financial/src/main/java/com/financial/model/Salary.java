package com.financial.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

@Entity
@Table(
        name = "salaries",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_salaries_user_year_month",
                columnNames = {"user_id", "reference_year", "reference_month"}
        )
)
@Check(constraints = "reference_month BETWEEN 1 AND 12 AND reference_year >= 2000 "
        + "AND (expected_amount IS NULL OR expected_amount > 0)")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Salary extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "reference_month", nullable = false)
    private Integer referenceMonth;

    @Column(name = "reference_year", nullable = false)
    private Integer referenceYear;

    // Total previsto da competencia (normalmente o valor da NF). NULL = nao informado.
    @Column(name = "expected_amount", precision = 12, scale = 2)
    private BigDecimal expectedAmount;

    @Column(name = "description", length = 255)
    private String description;
}
