package com.financial.chat.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import org.hibernate.annotations.ColumnTransformer;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Chunk de um documento do corpus indexado pelo RAG.
 *
 * O campo {@code embedding} eh armazenado no Postgres como {@code vector(768)}
 * mas expostos em Java como String no formato {@code "[0.1,0.2,...]"}. Motivo:
 * <ul>
 *   <li>pgvector-java 0.1.6 nao expoe UserType/AttributeConverter pronto pra
 *       Hibernate 6/7 — teria que registrar tipo no JDBC connection e complica</li>
 *   <li>String eh o formato serializado nativo do pgvector — o driver
 *       Postgres faz o cast automatico via {@code @ColumnTransformer}</li>
 * </ul>
 *
 * Conversores {@code float[] <-> String} ficam no util
 * {@code com.financial.chat.util.EmbeddingSerializer}.
 */
@Entity
@Table(name = "chat_document_chunks", uniqueConstraints = {
        @UniqueConstraint(name = "uk_chat_chunk_source_index",
                columnNames = {"source_path", "chunk_index"})
})
public class DocumentChunk {

    @Id
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @Column(name = "source_path", nullable = false, length = 500)
    private String sourcePath;

    @Column(name = "section", length = 500)
    private String section;

    @Column(name = "chunk_index", nullable = false)
    private int chunkIndex;

    @Column(name = "content", nullable = false, columnDefinition = "text")
    private String content;

    @Column(name = "token_count")
    private Integer tokenCount;

    /**
     * Serializacao pgvector do embedding: {@code "[0.123,0.456,...]"}.
     * O {@code @ColumnTransformer} faz o cast {@code ?::vector} no INSERT/UPDATE,
     * e no SELECT o valor volta como texto (formato ja compativel).
     */
    @Column(name = "embedding", nullable = false, columnDefinition = "vector(768)")
    @ColumnTransformer(write = "?::vector")
    private String embedding;

    @Column(name = "created_at", nullable = false, columnDefinition = "timestamp with time zone")
    private OffsetDateTime createdAt;

    protected DocumentChunk() {}

    public DocumentChunk(String sourcePath, String section, int chunkIndex,
                          String content, Integer tokenCount, String embedding) {
        this.id = UUID.randomUUID();
        this.sourcePath = sourcePath;
        this.section = section;
        this.chunkIndex = chunkIndex;
        this.content = content;
        this.tokenCount = tokenCount;
        this.embedding = embedding;
    }

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }

    public UUID getId() { return id; }
    public String getSourcePath() { return sourcePath; }
    public String getSection() { return section; }
    public int getChunkIndex() { return chunkIndex; }
    public String getContent() { return content; }
    public Integer getTokenCount() { return tokenCount; }
    public String getEmbedding() { return embedding; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}
