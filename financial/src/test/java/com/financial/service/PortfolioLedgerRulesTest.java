package com.financial.service;

import com.financial.exception.InvalidInvestmentOperationException;
import com.financial.model.InvestmentIncome;
import com.financial.model.InvestmentTransaction;
import com.financial.model.enums.InvestmentTransactionType;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PortfolioLedgerRulesTest {

    private static InvestmentTransaction tx(InvestmentTransactionType type, String date, int qty, String price) {
        return InvestmentTransaction.builder().type(type).tradeDate(LocalDate.parse(date)).quantity(qty)
                .unitPrice(price == null ? null : new BigDecimal(price)).build();
    }

    private final List<InvestmentTransaction> history = List.of(
            tx(InvestmentTransactionType.INITIAL, "2025-10-06", 84, null),
            tx(InvestmentTransactionType.BUY, "2025-10-20", 10, "9.00"),
            tx(InvestmentTransactionType.BUY, "2026-01-10", 5, "9.50"),
            tx(InvestmentTransactionType.SELL, "2026-02-01", 20, "9.80"));

    @Test
    void quantityAtDate() {
        assertThat(PortfolioHistoryService.quantityAt(history, LocalDate.parse("2025-10-31"))).isEqualTo(94);
        assertThat(PortfolioHistoryService.quantityAt(history, LocalDate.parse("2026-01-31"))).isEqualTo(99);
        assertThat(PortfolioHistoryService.quantityAt(history, LocalDate.parse("2026-02-28"))).isEqualTo(79);
    }

    @Test
    void estimatedPrice_isLastTradeUpToDate_orFirstTradeBeforeAny() {
        assertThat(PortfolioHistoryService.estimatedPrice(history, LocalDate.parse("2025-10-10"))).isEqualByComparingTo("9.00");
        assertThat(PortfolioHistoryService.estimatedPrice(history, LocalDate.parse("2026-01-31"))).isEqualByComparingTo("9.50");
        assertThat(PortfolioHistoryService.estimatedPrice(history, LocalDate.parse("2026-03-31"))).isEqualByComparingTo("9.80");
    }

    @Test
    void sellLargerThanPositionAtThatDate_isRejected() {
        List<InvestmentTransaction> bad = List.of(
                tx(InvestmentTransactionType.INITIAL, "2025-10-06", 10, null),
                tx(InvestmentTransactionType.SELL, "2025-10-07", 11, "9"),
                tx(InvestmentTransactionType.BUY, "2025-12-01", 50, "9"));
        assertThatThrownBy(() -> InvestmentLedgerService.ensureNeverNegative(bad))
                .isInstanceOf(InvalidInvestmentOperationException.class);
        InvestmentLedgerService.ensureNeverNegative(history);
    }

    @Test
    void incomeSplit_futurePaymentIsPendingNotReceived() {
        LocalDate today = LocalDate.parse("2026-10-06");
        List<InvestmentIncome> october = List.of(
                InvestmentIncome.builder().paymentDate(LocalDate.parse("2026-10-01")).amount(new BigDecimal("1.45")).build(),
                InvestmentIncome.builder().paymentDate(today).amount(new BigDecimal("10.00")).build(),
                InvestmentIncome.builder().paymentDate(LocalDate.parse("2026-10-08")).amount(new BigDecimal("31.85")).build());
        assertThat(PortfolioHistoryService.sumIncome(october, i -> !i.getPaymentDate().isAfter(today)))
                .isEqualByComparingTo("11.45");
        assertThat(PortfolioHistoryService.sumIncome(october, i -> i.getPaymentDate().isAfter(today)))
                .isEqualByComparingTo("31.85");
    }
}
