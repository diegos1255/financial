package com.financial.repository;

import com.financial.model.SeverancePayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SeverancePaymentRepository extends JpaRepository<SeverancePayment, UUID> {

    Optional<SeverancePayment> findByIdAndUserId(UUID id, UUID userId);

    List<SeverancePayment> findBySeveranceIdOrderByPaymentDateAscCreatedDateAsc(UUID severanceId);
}
