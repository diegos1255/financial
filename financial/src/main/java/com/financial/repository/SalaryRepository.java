package com.financial.repository;

import com.financial.model.Salary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SalaryRepository extends JpaRepository<Salary, UUID> {

    Optional<Salary> findByIdAndUserId(UUID id, UUID userId);

    boolean existsByUserIdAndReferenceYearAndReferenceMonth(UUID userId, Integer referenceYear, Integer referenceMonth);

    boolean existsByUserIdAndReferenceYearAndReferenceMonthAndIdNot(
            UUID userId, Integer referenceYear, Integer referenceMonth, UUID id);

    @Query("""
            SELECT s FROM Salary s
            WHERE s.user.id = :userId
              AND (:year IS NULL OR s.referenceYear = :year)
              AND (:month IS NULL OR s.referenceMonth = :month)
              AND (:bankAccountId IS NULL OR s.bankAccount.id = :bankAccountId)
            ORDER BY s.referenceYear DESC, s.referenceMonth DESC
            """)
    List<Salary> findFiltered(
            @Param("userId") UUID userId,
            @Param("year") Integer year,
            @Param("month") Integer month,
            @Param("bankAccountId") UUID bankAccountId);
}
