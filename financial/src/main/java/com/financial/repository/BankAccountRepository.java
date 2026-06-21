package com.financial.repository;

import com.financial.model.BankAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BankAccountRepository extends JpaRepository<BankAccount, UUID>, JpaSpecificationExecutor<BankAccount> {

    List<BankAccount> findAllByUserIdOrderByNameAsc(UUID userId);

    List<BankAccount> findAllByUserIdAndActiveTrueOrderByNameAsc(UUID userId);

    Optional<BankAccount> findByIdAndUserId(UUID id, UUID userId);
}
