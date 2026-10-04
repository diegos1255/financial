package com.financial.repository;

import com.financial.model.SalaryPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SalaryPaymentRepository extends JpaRepository<SalaryPayment, UUID> {

    Optional<SalaryPayment> findByIdAndUserId(UUID id, UUID userId);

    List<SalaryPayment> findBySalaryIdOrderByPaymentDateAscCreatedDateAsc(UUID salaryId);

    boolean existsBySalaryId(UUID salaryId);
}
