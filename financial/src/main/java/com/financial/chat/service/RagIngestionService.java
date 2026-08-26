package com.financial.chat.service;

import com.financial.chat.config.ChatProperties;
import com.financial.chat.client.GeminiEmbeddingClient;
import com.financial.chat.dto.ReindexResult;
import com.financial.chat.model.DocumentChunk;
import com.financial.chat.util.EmbeddingSerializer;
import com.financial.chat.util.MarkdownChunker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Stream;

@Service
public class RagIngestionService {

    private static final Logger log = LoggerFactory.getLogger(RagIngestionService.class);

    private final ChatProperties props;
    private final MarkdownChunker chunker;
    private final GeminiEmbeddingClient embeddingClient;
    private final IngestFileTx ingestFileTx;

    private final AtomicBoolean running = new AtomicBoolean(false);

    public RagIngestionService(ChatProperties props,
                                MarkdownChunker chunker,
                                GeminiEmbeddingClient embeddingClient,
                                IngestFileTx ingestFileTx) {
        this.props = props;
        this.chunker = chunker;
        this.embeddingClient = embeddingClient;
        this.ingestFileTx = ingestFileTx;
    }

    public ReindexResult reindex() {
        if (!running.compareAndSet(false, true)) {
            throw new IllegalStateException("reindex ja em andamento");
        }
        long started = System.currentTimeMillis();
        int filesProcessed = 0;
        int chunksCreated = 0;
        Path corpusRoot = Paths.get(props.getRag().getCorpusPath());
        try {
            List<Path> files = listCorpusFiles(corpusRoot);
            log.info("Reindex: {} arquivo(s) candidatos em {}", files.size(), corpusRoot);
            for (Path file : files) {
                String relative = corpusRoot.relativize(file).toString().replace('\\', '/');
                String sourcePath = "docs/" + relative;
                try {
                    int created = ingestFile(file, sourcePath);
                    filesProcessed++;
                    chunksCreated += created;
                    log.info("Reindex OK: {} ({} chunks)", sourcePath, created);
                } catch (Exception e) {
                    log.warn("Reindex FALHOU pra {}: {}", sourcePath, e.toString());
                }
            }
        } catch (IOException e) {
            throw new RuntimeException("falha ao listar corpus: " + e.getMessage(), e);
        } finally {
            running.set(false);
        }
        long took = System.currentTimeMillis() - started;
        log.info("Reindex concluido: {} arquivos, {} chunks, {}ms", filesProcessed, chunksCreated, took);
        return new ReindexResult(filesProcessed, chunksCreated, took);
    }

    private int ingestFile(Path file, String sourcePath) throws IOException, InterruptedException {
        String content = Files.readString(file);
        List<MarkdownChunker.Chunk> chunks = chunker.chunk(content, props.getRag().getChunkMaxTokens());
        if (chunks.isEmpty()) return 0;

        List<DocumentChunk> toSave = new ArrayList<>(chunks.size());
        for (int i = 0; i < chunks.size(); i++) {
            MarkdownChunker.Chunk c = chunks.get(i);
            float[] vec = embeddingClient.embed(c.content());
            String embedding = EmbeddingSerializer.toPgvector(vec);
            toSave.add(new DocumentChunk(
                    sourcePath,
                    c.section(),
                    i,
                    c.content(),
                    MarkdownChunker.estimateTokens(c.content()),
                    embedding
            ));
            long throttle = props.getRag().getThrottleMs();
            if (throttle > 0) Thread.sleep(throttle);
        }
        // Idempotencia: apaga tudo do arquivo (so apos ter sucesso em embed de
        // todos) e insere. Rodado em REQUIRES_NEW pra que uma falha aqui nao
        // afete outros arquivos ja processados.
        ingestFileTx.replaceFile(sourcePath, toSave);
        return toSave.size();
    }

    private List<Path> listCorpusFiles(Path root) throws IOException {
        if (!Files.isDirectory(root)) {
            throw new IOException("corpus-path nao eh diretorio: " + root);
        }
        List<String> whitelist = props.getRag().getCorpusWhitelist();
        List<Path> out = new ArrayList<>();
        try (Stream<Path> stream = Files.walk(root)) {
            stream.filter(Files::isRegularFile)
                    .filter(p -> p.getFileName().toString().endsWith(".md"))
                    .filter(p -> matchesWhitelist(root.relativize(p).toString().replace('\\', '/'), whitelist))
                    .forEach(out::add);
        }
        return out;
    }

    private boolean matchesWhitelist(String relativePath, List<String> whitelist) {
        for (String rule : whitelist) {
            if (rule.endsWith("/")) {
                if (relativePath.startsWith(rule)) return true;
            } else {
                if (relativePath.equals(rule)) return true;
            }
        }
        return false;
    }
}
