package com.financial.repository;

import com.financial.model.Installment;
import com.financial.model.enums.InstallmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InstallmentRepository extends JpaRepository<Installment, UUID> {

    List<Installment> findByExpenseIdOrderByInstallmentNumberAsc(UUID expenseId);

    @Query("""
            SELECT i FROM Installment i
              JOIN i.expense e
             WHERE i.id = :id
               AND e.user.id = :userId
            """)
    Optional<Installment> findByIdAndUserId(@Param("id") UUID id, @Param("userId") UUID userId);

    @Modifying
    @Query("""
            UPDATE Installment i
               SET i.status = :cancelled
             WHERE i.expense.id = :expenseId
               AND i.status = :pending
            """)
    int cancelPendingByExpenseId(
            @Param("expenseId") UUID expenseId,
            @Param("pending") InstallmentStatus pending,
            @Param("cancelled") InstallmentStatus cancelled);
}
