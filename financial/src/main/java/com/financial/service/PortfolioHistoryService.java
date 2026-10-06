package com.financial.service;

import com.financial.auth.CurrentUser;
import com.financial.dto.MarketPriceCache;
import com.financial.dto.PortfolioHistoryResponse;
import com.financial.integration.BrapiClient;
import com.financial.model.InvestmentIncome;
import com.financial.model.InvestmentMonthlyPrice;
import com.financial.model.InvestmentTransaction;
import com.financial.model.enums.InvestmentTransactionType;
import com.financial.repository.InvestmentIncomeRepository;
import com.financial.repository.InvestmentMonthlyPriceRepository;
import com.financial.repository.InvestmentTransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Predicate;
import java.util.stream.Collectors;

/**
 * Evolucao patrimonial e proventos mes a mes (WORK-36).
 * Patrimonio do mes = cotas no ultimo dia do mes x preco de fechamento, onde o preco e:
 * mes atual -> cotacao ao vivo; meses gravados -> fechamento real da Brapi; demais -> preco da
 * ultima compra do proprio usuario (marcado como estimado). O plano gratuito da Brapi so tem
 * 3 meses de historico: os fechamentos sao gravados para o historico nao se perder.
 */
@Service
@Transactional
public class PortfolioHistoryService {

    private static final ZoneId SAO_PAULO = ZoneId.of("America/Sao_Paulo");
    private static final int BRAPI_WINDOW_MONTHS = 3;

    private final InvestmentTransactionRepository transactionRepository;
    private final InvestmentIncomeRepository incomeRepository;
    private final InvestmentMonthlyPriceRepository priceRepository;
    private final MarketPriceService marketPriceService;
    private final BrapiClient brapiClient;

    public PortfolioHistoryService(InvestmentTransactionRepository transactionRepository,
                                   InvestmentIncomeRepository incomeRepository,
                                   InvestmentMonthlyPriceRepository priceRepository,
                                   MarketPriceService marketPriceService,
                                   BrapiClient brapiClient) {
        this.transactionRepository = transactionRepository;
        this.incomeRepository = incomeRepository;
        this.priceRepository = priceRepository;
        this.marketPriceService = marketPriceService;
        this.brapiClient = brapiClient;
    }

    public PortfolioHistoryResponse history(int months) {
        UUID userId = CurrentUser.id();
        LocalDate today = LocalDate.now(SAO_PAULO);
        YearMonth current = YearMonth.from(today);
        YearMonth first = current.minusMonths(months - 1L);

        Map<String, List<InvestmentTransaction>> byTicker = transactionRepository
                .findByUserIdOrderByTradeDateAscCreatedDateAsc(userId).stream()
                .collect(Collectors.groupingBy(t -> t.getInvestment().getTicker()));

        storeBrapiCloses(byTicker.keySet(), current);
        Map<String, BigDecimal> closes = new HashMap<>();
        priceRepository.findByTickerIn(byTicker.keySet())
                .forEach(p -> closes.put(key(p.getTicker(), YearMonth.of(p.getYear(), p.getMonth())), p.getClosePrice()));

        List<InvestmentIncome> incomes = incomeRepository.findByUserIdAndPaymentDateBetween(
                userId, first.atDay(1).minusDays(90), current.atEndOfMonth());

        List<PortfolioHistoryResponse.Month> result = new ArrayList<>();
        for (YearMonth ym = first; !ym.isAfter(current); ym = ym.plusMonths(1)) {
            LocalDate end = ym.equals(current) ? today : ym.atEndOfMonth();
            BigDecimal value = BigDecimal.ZERO;
            boolean estimated = false;

            for (Map.Entry<String, List<InvestmentTransaction>> e : byTicker.entrySet()) {
                int quantity = quantityAt(e.getValue(), end);
                if (quantity <= 0) {
                    continue;
                }
                BigDecimal price = ym.equals(current)
                        ? marketPriceService.getPrice(e.getKey()).map(MarketPriceCache::price).orElse(null)
                        : closes.get(key(e.getKey(), ym));
                if (price == null) {
                    price = estimatedPrice(e.getValue(), end);
                    estimated = true;
                }
                if (price != null) {
                    value = value.add(price.multiply(BigDecimal.valueOf(quantity)));
                }
            }

            YearMonth month = ym;
            List<InvestmentIncome> ofMonth = incomes.stream()
                    .filter(i -> YearMonth.from(i.getPaymentDate()).equals(month))
                    .toList();
            result.add(new PortfolioHistoryResponse.Month(ym.getYear(), ym.getMonthValue(),
                    value.setScale(2, RoundingMode.HALF_UP),
                    sumIncome(ofMonth, i -> !i.getPaymentDate().isAfter(today)),
                    sumIncome(ofMonth, i -> i.getPaymentDate().isAfter(today)),
                    estimated));
        }

        BigDecimal currentValue = result.getLast().marketValue();
        BigDecimal previous = result.size() > 1 ? result.get(result.size() - 2).marketValue() : BigDecimal.ZERO;
        BigDecimal change = currentValue.subtract(previous);
        BigDecimal changePercent = previous.signum() > 0
                ? change.multiply(BigDecimal.valueOf(100)).divide(previous, 2, RoundingMode.HALF_UP) : null;
        BigDecimal income90 = sumIncome(incomes, i -> !i.getPaymentDate().isBefore(today.minusDays(90))
                && !i.getPaymentDate().isAfter(today));

        return new PortfolioHistoryResponse(currentValue, change, changePercent, income90, result);
    }

    /** Grava o ultimo fechamento de cada mes fechado dentro da janela da Brapi (so busca se faltar algum). */
    void storeBrapiCloses(Iterable<String> tickers, YearMonth current) {
        for (String ticker : tickers) {
            boolean missing = false;
            for (int i = 1; i <= BRAPI_WINDOW_MONTHS - 1; i++) {
                YearMonth ym = current.minusMonths(i);
                if (priceRepository.findByTickerAndYearAndMonth(ticker, ym.getYear(), ym.getMonthValue()).isEmpty()) {
                    missing = true;
                    break;
                }
            }
            if (!missing) {
                continue;
            }
            Map<YearMonth, BrapiClient.BrapiDailyPrice> lastOfMonth = new HashMap<>();
            for (BrapiClient.BrapiDailyPrice p : brapiClient.fetchHistory(ticker)) {
                if (p.close() == null) {
                    continue;
                }
                YearMonth ym = YearMonth.from(Instant.ofEpochSecond(p.date()).atZone(SAO_PAULO).toLocalDate());
                lastOfMonth.merge(ym, p, (a, b) -> a.date() >= b.date() ? a : b);
            }
            // So meses ja encerrados: o mes atual ainda nao tem fechamento.
            lastOfMonth.forEach((ym, p) -> {
                if (ym.isBefore(current)
                        && priceRepository.findByTickerAndYearAndMonth(ticker, ym.getYear(), ym.getMonthValue()).isEmpty()) {
                    priceRepository.save(InvestmentMonthlyPrice.builder()
                            .ticker(ticker).year(ym.getYear()).month(ym.getMonthValue())
                            .closePrice(p.close()).build());
                }
            });
        }
    }

    /** Provento com data futura ainda nao foi pago: conta como "a receber", nunca como recebido. */
    static BigDecimal sumIncome(List<InvestmentIncome> incomes, Predicate<InvestmentIncome> filter) {
        return incomes.stream().filter(filter).map(InvestmentIncome::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    static int quantityAt(List<InvestmentTransaction> transactions, LocalDate date) {
        return transactions.stream()
                .filter(t -> !t.getTradeDate().isAfter(date))
                .mapToInt(InvestmentLedgerService::signedQuantity)
                .sum();
    }

    /** Preco da ultima compra/venda ate a data; sem nenhuma ainda, o da primeira posterior. */
    static BigDecimal estimatedPrice(List<InvestmentTransaction> transactions, LocalDate date) {
        List<InvestmentTransaction> priced = transactions.stream()
                .filter(t -> t.getType() != InvestmentTransactionType.INITIAL && t.getUnitPrice() != null)
                .sorted(Comparator.comparing(InvestmentTransaction::getTradeDate))
                .toList();
        Optional<InvestmentTransaction> lastBefore = priced.stream()
                .filter(t -> !t.getTradeDate().isAfter(date))
                .reduce((a, b) -> b);
        return lastBefore.or(() -> priced.stream().findFirst()).map(InvestmentTransaction::getUnitPrice).orElse(null);
    }

    private static String key(String ticker, YearMonth ym) {
        return ticker + "@" + ym;
    }
}
