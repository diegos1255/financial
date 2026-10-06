package com.financial.repository;

import com.financial.model.InvestmentIncome;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InvestmentIncomeRepository extends JpaRepository<InvestmentIncome, UUID> {

    List<InvestmentIncome> findByInvestmentIdOrderByPaymentDateDesc(UUID investmentId);

    List<InvestmentIncome> findByUserIdAndPaymentDateBetween(UUID userId, LocalDate from, LocalDate to);

    Optional<InvestmentIncome> findByIdAndUserId(UUID id, UUID userId);
}
