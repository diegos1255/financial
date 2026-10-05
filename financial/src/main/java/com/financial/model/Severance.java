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

/**
 * Rescisao do usuario (WORK-31): valor total + recebimentos lancados a mao.
 * Uma por usuario (D-1).
 */
@Entity
@Table(
        name = "severances",
        uniqueConstraints = @UniqueConstraint(name = "uk_severances_user", columnNames = "user_id")
)
@Check(constraints = "total_amount IS NULL OR total_amount > 0")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Severance extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "total_amount", precision = 12, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "description", length = 255)
    private String description;
}
