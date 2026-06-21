package com.financial.repository;

import com.financial.model.Investment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InvestmentRepository extends JpaRepository<Investment, UUID>, JpaSpecificationExecutor<Investment> {

    List<Investment> findAllByUserIdOrderByTickerAsc(UUID userId);

    List<Investment> findAllByUserIdAndActiveTrueOrderByTickerAsc(UUID userId);

    Optional<Investment> findByIdAndUserId(UUID id, UUID userId);

    boolean existsByUserIdAndTicker(UUID userId, String ticker);

    boolean existsByUserIdAndTickerAndIdNot(UUID userId, String ticker, UUID id);
}
