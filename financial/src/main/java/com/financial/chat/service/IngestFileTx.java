package com.financial.chat.service;

import com.financial.chat.model.DocumentChunk;
import com.financial.chat.repository.DocumentChunkRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Bean helper isolado só pra que o {@code @Transactional REQUIRES_NEW}
 * funcione. Se ficasse no {@link RagIngestionService}, a chamada
 * self-invocation não seria interceptada pelo Spring proxy.
 * <p>
 * Cada arquivo é ingerido em sua própria transação. Falha num arquivo
 * não corrompe os anteriores.
 */
@Component
public class IngestFileTx {

    private final DocumentChunkRepository repository;

    public IngestFileTx(DocumentChunkRepository repository) {
        this.repository = repository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void replaceFile(String sourcePath, List<DocumentChunk> newChunks) {
        repository.deleteBySourcePath(sourcePath);
        repository.flush();
        repository.saveAll(newChunks);
    }
}
