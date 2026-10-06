package com.financial.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * Fechamento mensal real de um ticker, vindo da Brapi (WORK-36). O plano gratuito so tem 3 meses
 * de historico: gravar aqui torna o historico permanente. Dado de mercado, nao e por usuario.
 */
@Entity
@Table(
        name = "investment_monthly_prices",
        uniqueConstraints = @UniqueConstraint(name = "uk_inv_price_ticker_month", columnNames = {"ticker", "year", "month"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvestmentMonthlyPrice extends BaseEntity {

    @Column(name = "ticker", nullable = false, length = 20)
    private String ticker;

    @Column(name = "year", nullable = false)
    private Integer year;

    @Column(name = "month", nullable = false)
    private Integer month;

    @Column(name = "close_price", nullable = false, precision = 14, scale = 4)
    private BigDecimal closePrice;
}
