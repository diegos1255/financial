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

@Entity
@Table(
        name = "investments",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_investments_user_ticker",
                columnNames = {"user_id", "ticker"}
        )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Investment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "ticker", nullable = false, length = 20)
    private String ticker;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @Column(name = "description", length = 255)
    private String description;

    @Column(name = "active", nullable = false)
    private Boolean active;
}
