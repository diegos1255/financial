package com.financial.repository;

import com.financial.model.Salary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface SalaryRepository extends JpaRepository<Salary, UUID> {

    Optional<Salary> findByUserIdAndReferenceYearAndReferenceMonth(UUID userId, Integer referenceYear, Integer referenceMonth);
}
