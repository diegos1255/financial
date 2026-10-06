package com.financial.dto;

import java.math.BigDecimal;
import java.util.List;

/** Evolucao patrimonial e proventos mes a mes (WORK-36). */
public record PortfolioHistoryResponse(
        BigDecimal currentValue,
        BigDecimal changeThisMonth,
        BigDecimal changeThisMonthPercent,
        BigDecimal incomeLast90Days,
        List<Month> months
) {
    /**
     * {@code income}: proventos ja pagos; {@code incomePending}: a receber (data futura, so no mes corrente).
     * {@code estimated}: algum ativo do mes usou o preco da ultima compra (sem fechamento real).
     */
    public record Month(int year, int month, BigDecimal marketValue, BigDecimal income,
                        BigDecimal incomePending, boolean estimated) {}
}
