package com.financial.chat.service;

import com.financial.chat.config.ChatProperties;
import com.financial.chat.repository.DocumentChunkRepository;
import com.financial.chat.util.EmbeddingSerializer;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Retrieval no pgvector via cosine distance. topK e minScore vem do config.
 */
@Service
public class RagRetrievalService {

    private final DocumentChunkRepository repository;
    private final ChatProperties props;

    public RagRetrievalService(DocumentChunkRepository repository, ChatProperties props) {
        this.repository = repository;
        this.props = props;
    }

    public List<RetrievedChunk> topK(float[] queryEmbedding) {
        String embeddingLiteral = EmbeddingSerializer.toPgvector(queryEmbedding);
        List<Object[]> rows = repository.findSimilar(
                embeddingLiteral,
                props.getRag().getMinScore(),
                props.getRag().getTopK()
        );
        List<RetrievedChunk> out = new ArrayList<>(rows.size());
        for (Object[] row : rows) {
            out.add(new RetrievedChunk(
                    (UUID) row[0],
                    (String) row[1],
                    (String) row[2],
                    (String) row[3],
                    ((Number) row[4]).doubleValue()
            ));
        }
        return out;
    }
}
