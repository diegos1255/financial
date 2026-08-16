package com.financial.gmail.repository;

import com.financial.gmail.model.GmailCredential;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface GmailCredentialRepository extends JpaRepository<GmailCredential, UUID> {

    Optional<GmailCredential> findByUserId(UUID userId);

    boolean existsByUserId(UUID userId);

    void deleteByUserId(UUID userId);
}
