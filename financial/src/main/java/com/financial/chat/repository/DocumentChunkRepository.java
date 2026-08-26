package com.financial.chat.repository;

import com.financial.chat.model.DocumentChunk;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface DocumentChunkRepository extends JpaRepository<DocumentChunk, UUID> {

    long deleteBySourcePath(String sourcePath);

    long countBySourcePath(String sourcePath);
}
