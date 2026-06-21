package com.financial.repository;

import com.financial.model.Expense;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, UUID>, JpaSpecificationExecutor<Expense> {

    Optional<Expense> findByIdAndUserId(UUID id, UUID userId);

    @EntityGraph(attributePaths = "installments")
    @Query("SELECT e FROM Expense e WHERE e.id = :id AND e.user.id = :userId")
    Optional<Expense> findByIdAndUserIdWithInstallments(@Param("id") UUID id, @Param("userId") UUID userId);
}
