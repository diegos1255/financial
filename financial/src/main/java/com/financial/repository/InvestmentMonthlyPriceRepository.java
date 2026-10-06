package com.financial.repository;

import com.financial.model.InvestmentMonthlyPrice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InvestmentMonthlyPriceRepository extends JpaRepository<InvestmentMonthlyPrice, UUID> {

    List<InvestmentMonthlyPrice> findByTickerIn(Collection<String> tickers);

    Optional<InvestmentMonthlyPrice> findByTickerAndYearAndMonth(String ticker, Integer year, Integer month);
}
