package com.financial.chat.repository;

import com.financial.chat.model.DocumentChunk;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface DocumentChunkRepository extends JpaRepository<DocumentChunk, UUID> {

    long deleteBySourcePath(String sourcePath);

    long countBySourcePath(String sourcePath);

    /**
     * Similarity search por cosine distance no pgvector.
     * {@code <=>} eh o operador de cosine distance (0 = idental, 2 = oposto).
     * {@code 1 - distance} converte pra score intuitivo (1 = idental, -1 = oposto).
     * <p>
     * O parametro {@code embedding} deve ser a serializacao pgvector
     * ("[0.1,0.2,...]") — o cast pra vector eh explicito no SQL.
     * <p>
     * Retorna Object[]: [id, source_path, section, content, score].
     */
    @Query(value = """
            SELECT id, source_path, section, content,
                   1 - (embedding <=> CAST(:embedding AS vector)) AS score
            FROM chat_document_chunks
            WHERE 1 - (embedding <=> CAST(:embedding AS vector)) >= :minScore
            ORDER BY embedding <=> CAST(:embedding AS vector) ASC
            LIMIT :topK
            """, nativeQuery = true)
    List<Object[]> findSimilar(@Param("embedding") String embedding,
                                @Param("minScore") double minScore,
                                @Param("topK") int topK);
}
