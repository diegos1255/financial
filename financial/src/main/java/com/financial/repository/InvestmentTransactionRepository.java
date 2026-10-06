package com.financial.repository;

import com.financial.model.InvestmentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InvestmentTransactionRepository extends JpaRepository<InvestmentTransaction, UUID> {

    List<InvestmentTransaction> findByInvestmentIdOrderByTradeDateAscCreatedDateAsc(UUID investmentId);

    List<InvestmentTransaction> findByUserIdOrderByTradeDateAscCreatedDateAsc(UUID userId);

    Optional<InvestmentTransaction> findByIdAndUserId(UUID id, UUID userId);

    boolean existsByInvestmentId(UUID investmentId);
}
