package com.financial.repository;

import com.financial.model.ExpenseCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ExpenseCategoryRepository extends JpaRepository<ExpenseCategory, UUID>, JpaSpecificationExecutor<ExpenseCategory> {

    List<ExpenseCategory> findAllByUserIdOrderByNameAsc(UUID userId);

    List<ExpenseCategory> findAllByUserIdAndActiveTrueOrderByNameAsc(UUID userId);

    Optional<ExpenseCategory> findByIdAndUserId(UUID id, UUID userId);

    boolean existsByUserIdAndNameIgnoreCase(UUID userId, String name);

    boolean existsByUserIdAndNameIgnoreCaseAndIdNot(UUID userId, String name, UUID id);
}
