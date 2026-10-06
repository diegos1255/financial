package com.financial.model;

import com.financial.model.enums.InvestmentDataSource;
import com.financial.model.enums.InvestmentTransactionType;
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

/**
 * Movimentacao de um investimento (WORK-36): saldo inicial, compra ou venda.
 * A quantidade do investimento e a soma INITIAL + BUY - SELL.
 */
@Entity
@Table(
        name = "investment_transactions",
        uniqueConstraints = @UniqueConstraint(name = "uk_inv_tx_user_external", columnNames = {"user_id", "external_key"}),
        indexes = @Index(name = "idx_inv_tx_investment_date", columnList = "investment_id, trade_date")
)
@Check(constraints = "quantity > 0")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvestmentTransaction extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "investment_id", nullable = false)
    private Investment investment;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 10)
    private InvestmentTransactionType type;

    @Column(name = "trade_date", nullable = false)
    private LocalDate tradeDate;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @Column(name = "unit_price", precision = 14, scale = 4)
    private BigDecimal unitPrice;

    @Column(name = "total", precision = 12, scale = 2)
    private BigDecimal total;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 10)
    private InvestmentDataSource source;

    // Hash da linha da B3 (historico importado uma vez; a importacao foi removida — D-10).
    @Column(name = "external_key", length = 64)
    private String externalKey;
}
