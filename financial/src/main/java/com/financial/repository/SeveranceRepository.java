package com.financial.repository;

import com.financial.model.Severance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface SeveranceRepository extends JpaRepository<Severance, UUID> {

    Optional<Severance> findByUserId(UUID userId);
}
