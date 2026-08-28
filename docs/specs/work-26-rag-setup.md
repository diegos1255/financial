# WORK-26 — RAG setup (pgvector + schema + config Gemini)

## Metadados

- `spec_id`: WORK-26
- `titulo_tecnico`: Chat RAG — Fase 1: infra base (pgvector, tabela `chat_document_chunks`, configuração Gemini)
- `source_product_spec`: `docs/05-rag-plan.md`
- `source_product_spec_version`: 1
- `baseline_branch_or_commit`: `master @ 03936b8`
- `target_branch`: `rag-integration` (branch única pra toda a feature RAG)
- `escopo_sistema`: financial (backend, migração, config) + docker-compose (não precisa mexer)
- `última_atualização`: 2026-08-23

## 1. Objective do documento

- Habilitar a extensão **pgvector** no Postgres via `data.sql`
- Criar a tabela `chat_document_chunks` com coluna `embedding vector(768)`
- Adicionar as configurações do Gemini no `application.yml` + `.env.example`
- Criar DTOs base do módulo chat (`ChatQueryRequest`, `ChatAnswer`, `ChunkSource`) — usados nas próximas WORKs
- Criar `com.financial.chat` package skeleton
- **Não cobre**: nenhuma lógica de ingestion ou query — só infra e config

## 2. System overview

- **Estado atual**: sistema não tem chat nem RAG. Postgres não tem pgvector habilitado.
- **Estado alvo**: infra do RAG pronta pra receber a lógica das próximas WORKs. Sistema sobe normalmente com ou sem `GEMINI_API_KEY` (feature flag).
- **Delta técnico**:
  - `data.sql`: `CREATE EXTENSION IF NOT EXISTS vector;` no topo
  - Nova entidade `DocumentChunk` + tabela `chat_document_chunks`
  - Nova dep no `pom.xml`: `com.pgvector:pgvector` (type adapter Java ↔ Postgres)
  - `application.yml` ganha bloco `chat.*` com Gemini config
  - `.env.example` documenta `GEMINI_API_KEY`, `CHAT_RAG_TOP_K`, `CHAT_RAG_MIN_SCORE`
  - `com.financial.chat.config.ChatProperties` (`@ConfigurationProperties(prefix="chat")`)
  - `com.financial.chat.model.DocumentChunk` (entidade JPA)
  - `com.financial.chat.repository.DocumentChunkRepository`
  - DTOs em `com.financial.chat.dto`
- **Fora de escopo**: chunking, embeddings, query, widget, endpoint
- **Restrições obrigatórias**:
  - Extensão pgvector deve ser idempotente (`IF NOT EXISTS`)
  - Sistema sobe sem `GEMINI_API_KEY` (log de warning; chat retorna `enabled=false` na WORK-28)
  - `chat_document_chunks` sem `user_id` (corpus é compartilhado — todas as specs são do sistema; se um dia tiver corpus per-user, adiciona coluna depois)

## 3. Architecture design

- **pgvector como extensão do Postgres**:
  - Instalada no container `pgvector/pgvector:pg16` (mudar imagem no `docker-compose.yml`) OU manter `postgres:16-alpine` + habilitar via SQL (extensão já vem no core do Postgres 16? — **não**, é extensão externa; precisa imagem `pgvector`)
  - Decisão: **trocar imagem base do Postgres pra `pgvector/pgvector:pg16`**. É drop-in compatible, mesmo volume, mesmos dados.
- **Tabela com embedding**:
  - Coluna `embedding vector(768)` — 768 é a dimensão do `text-embedding-004` do Gemini
  - Índice **HNSW** pra similarity search: `CREATE INDEX ... USING hnsw (embedding vector_cosine_ops);`
  - Alternativas descartadas: `ivfflat` (precisa de pelo menos 1000 rows pra tunar direito; corpus pequeno)
- **Trade-offs**:
  - Trocar imagem do Postgres em vez de instalar pgvector manualmente → menos manutenção
  - Coluna `vector(768)` fixa em vez de dinâmica → simplicidade; se um dia mudar de modelo de embedding, é migração explícita
  - Índice HNSW sempre criado (não lazy) → recall alto de saída, sem tuning

## 4. Data design

- **Nova tabela `chat_document_chunks`**:

  | Coluna | Tipo | Nullable | Constraints |
  |---|---|---|---|
  | `id` | uuid | NOT NULL | PK, `gen_random_uuid()` |
  | `source_path` | varchar(500) | NOT NULL | ex: `docs/specs/work-05-salary.md` |
  | `section` | varchar(500) | NULL | header da seção (ex: "Objetivo") ou NULL se chunk fixo |
  | `chunk_index` | integer | NOT NULL | ordem do chunk dentro do arquivo (0-based) |
  | `content` | text | NOT NULL | texto puro do chunk |
  | `token_count` | integer | NULL | contagem aproximada; útil pra debug |
  | `embedding` | vector(768) | NOT NULL | embedding do content via Gemini |
  | `created_at` | timestamptz | NOT NULL | `now()` |

  - Índice único: `(source_path, chunk_index)` — reindexação idempotente
  - Índice HNSW: `embedding` com `vector_cosine_ops`

- **Sem migrations** (regra do projeto). Schema via Hibernate `ddl-auto=update` **exceto** a extensão + índice HNSW → vão em `data.sql`:

  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  -- índice criado após a tabela ser gerada (Hibernate cria a tabela primeiro; índice é IF NOT EXISTS)
  CREATE INDEX IF NOT EXISTS idx_chat_chunks_embedding
    ON chat_document_chunks USING hnsw (embedding vector_cosine_ops);
  ```

- **Type mapping Java ↔ pgvector**:
  - Campo Java: `float[] embedding` OU `com.pgvector.PGvector embedding`
  - Preferência: `float[]` com `@JdbcTypeCode(SqlTypes.VECTOR)` (Hibernate 6.2+ suporta vetores) ou `@Type(PGvectorType.class)` via lib `pgvector-java`
  - Decisão final durante implementação: começar pela lib `com.pgvector:pgvector` (mais explícito, funciona)

## 5. Interface design

- **Sem novos endpoints REST nesta WORK** — só schema + config. Endpoints entram nas WORKs seguintes.
- **DTOs criados** (serão usados por WORK-27 e WORK-28):

  ```java
  public record ChatQueryRequest(
      @NotBlank @Size(max = 500) String question,
      String sessionId  // opcional; hoje não persiste, só passa pro log
  ) {}

  public record ChatAnswer(
      String answer,
      List<ChunkSource> sources,
      long tookMs
  ) {}

  public record ChunkSource(
      String sourcePath,   // "docs/specs/work-05-salary.md"
      String section,      // "Objetivo" ou null
      double score         // similarity score
  ) {}

  public record ReindexResult(
      int filesProcessed,
      int chunksCreated,
      long tookMs
  ) {}
  ```

## 6. Component design

### `CMP-01` DocumentChunk (entidade JPA)

- Path: `com.financial.chat.model.DocumentChunk`
- Campos:
  - `UUID id`
  - `String sourcePath`
  - `String section` (nullable)
  - `int chunkIndex`
  - `String content` (`@Column(columnDefinition = "text")`)
  - `Integer tokenCount` (nullable)
  - `float[] embedding` com type adapter pgvector
  - `OffsetDateTime createdAt`
- Sem soft-delete (reindexação apaga fisicamente e reinsere)

### `CMP-02` DocumentChunkRepository

- Path: `com.financial.chat.repository.DocumentChunkRepository`
- Extends `JpaRepository<DocumentChunk, UUID>`
- Métodos:
  - `void deleteBySourcePath(String sourcePath)` — pra reindexação idempotente
  - `long countBySourcePath(String sourcePath)`
  - Similarity search vem em WORK-28 (via `@Query` native com `<=>` operator)

### `CMP-03` ChatProperties

- Path: `com.financial.chat.config.ChatProperties`
- Campos:

  ```java
  @ConfigurationProperties(prefix = "chat")
  public class ChatProperties {
      private Gemini gemini = new Gemini();
      private Rag rag = new Rag();

      public static class Gemini {
          private String apiKey;
          private String baseUrl = "https://generativelanguage.googleapis.com/v1beta";
          private String embeddingModel = "text-embedding-004";
          private String chatModel = "gemini-1.5-flash";
      }

      public static class Rag {
          private int topK = 5;
          private double minScore = 0.55;
          private int chunkMaxTokens = 800;
      }

      public boolean isEnabled() {
          return gemini.apiKey != null && !gemini.apiKey.isBlank();
      }
  }
  ```

### `CMP-04` ChatConfig

- Path: `com.financial.chat.config.ChatConfig`
- Só `@Configuration @EnableConfigurationProperties(ChatProperties.class)`

## 7. UI and interaction design

- Nada de UI nesta WORK.

## 8. Runtime and operations

- **Config `application.yml`** (bloco novo):
  ```yaml
  chat:
    gemini:
      api-key: ${GEMINI_API_KEY:}
      base-url: https://generativelanguage.googleapis.com/v1beta
      embedding-model: text-embedding-004
      chat-model: gemini-1.5-flash
    rag:
      top-k: ${CHAT_RAG_TOP_K:5}
      min-score: ${CHAT_RAG_MIN_SCORE:0.55}
      chunk-max-tokens: 800
  ```

- **`.env.example`** (adicionar):
  ```
  # === Chat / RAG (Gemini) ===
  GEMINI_API_KEY=            # https://aistudio.google.com/apikey (free tier)
  CHAT_RAG_TOP_K=5
  CHAT_RAG_MIN_SCORE=0.55
  ```

- **`docker-compose.yml` + `docker-compose.dist.yml`**:
  - Trocar imagem do serviço `postgres` de `postgres:16-alpine` (ou similar) pra `pgvector/pgvector:pg16`
  - Passar `GEMINI_API_KEY` do host pro container `backend` (mesma técnica do `ELEVENLABS_API_KEY`)
- **`pom.xml`** (adicionar):
  ```xml
  <dependency>
      <groupId>com.pgvector</groupId>
      <artifactId>pgvector</artifactId>
      <version>0.1.6</version>
  </dependency>
  ```
- **Log de startup**: quando `chat.enabled=false` (sem API key), logar `WARN` uma vez no boot informando que o chat está desabilitado. Sem exception.

## 9. Security, privacy and compliance

- **`GEMINI_API_KEY`**: env var only, nunca no código. Fica só no `.env` local (gitignored).
- **Sem PII no corpus**: as specs não têm dados pessoais reais. Se algum dia indexar dados operacionais (Salary, Expense), rever política.
- **Sem RLS**: corpus é compartilhado; `user_id` não vai na tabela (ver seção 4 — decisão explícita).

## 10. Requirement mapping

### `REQ-26-01` pgvector habilitado

- Aceite: `docker-compose up -d` sobe Postgres; conectar via DBeaver e rodar `SELECT * FROM pg_extension WHERE extname='vector';` retorna 1 linha
- Testes: manual

### `REQ-26-02` Tabela criada corretamente

- Aceite: `\d chat_document_chunks` no psql mostra todas as colunas + índice HNSW + índice único
- Testes: manual + spring-boot test rápido de save/find

### `REQ-26-03` Sistema sobe sem API key

- Aceite: remover `GEMINI_API_KEY` do `.env`, rebuild, sistema sobe sem erro; log de warn "chat desabilitado"
- Testes: manual

### `REQ-26-04` Config resolve corretamente

- Aceite: passar `GEMINI_API_KEY=xxx` e ver `ChatProperties#isEnabled() == true`
- Testes: manual (via debug ou log de startup)

## 11. Implementation plan input

### `WORK-26A` docker + Postgres

- Arquivos:
  - `financial/docker-compose.yml`
  - `financial/docker-compose.dist.yml`
- Mudanças:
  - Troca imagem: `pgvector/pgvector:pg16` (verificar tag exata mais recente)
  - Passa `GEMINI_API_KEY` como env var
- Validar: `docker-compose up -d && docker exec financial-postgres psql -U financial -d financial -c 'SELECT extname FROM pg_extension;'`

### `WORK-26B` Schema (data.sql)

- Arquivo: `financial/src/main/resources/data.sql`
- Mudança: adicionar `CREATE EXTENSION` no topo + índice HNSW depois do bloco de menus
- Validar: subir backend, ver DDL do Hibernate criar `chat_document_chunks`, e o índice HNSW ser criado

### `WORK-26C` Entidade + repository + DTOs + config

- Arquivos:
  - `financial/src/main/java/com/financial/chat/model/DocumentChunk.java`
  - `financial/src/main/java/com/financial/chat/repository/DocumentChunkRepository.java`
  - `financial/src/main/java/com/financial/chat/config/ChatProperties.java`
  - `financial/src/main/java/com/financial/chat/config/ChatConfig.java`
  - `financial/src/main/java/com/financial/chat/dto/ChatQueryRequest.java`
  - `financial/src/main/java/com/financial/chat/dto/ChatAnswer.java`
  - `financial/src/main/java/com/financial/chat/dto/ChunkSource.java`
  - `financial/src/main/java/com/financial/chat/dto/ReindexResult.java`
  - `financial/pom.xml` (dep pgvector)
  - `financial/src/main/resources/application.yml` (bloco chat)
  - `financial/.env.example`
- Validar: `./mvnw clean compile` passa; sistema sobe com e sem `GEMINI_API_KEY`

## 12. Test plan

- **Unit**: nenhum novo (nada de lógica ainda)
- **Manual (Diego)**:
  - [ ] `docker-compose up -d` sobe sem erro após troca de imagem
  - [ ] `SELECT extname FROM pg_extension;` retorna `vector`
  - [ ] Backend sobe sem `GEMINI_API_KEY` (log de warn)
  - [ ] Backend sobe com `GEMINI_API_KEY` (sem warn)
  - [ ] Tabela `chat_document_chunks` existe com colunas corretas + índice HNSW
  - [ ] Dashboard/Email/PJ continuam funcionando (regressão)

## 13. Open items

- **Bloqueios**: Diego precisa criar a `GEMINI_API_KEY` em https://aistudio.google.com/apikey **antes** de iniciar a WORK-27 (dá pra deixar a spec 26 rodar sem)
- **Riscos**:
  - Troca de imagem do Postgres: teoricamente drop-in, mas restart do container é obrigatório; se der algum problema de compatibilidade de versão, cair de volta pra `postgres:16-alpine` + instalar pgvector via SQL (`CREATE EXTENSION` já falha nesse caso — precisa instalar pacote no container). Preferir a imagem oficial pgvector.
- **Decisões**:
  - Type mapping Java ↔ pgvector via `com.pgvector:pgvector` (dep leve, well-maintained). Se der problema, fallback pra JDBC array.
- **Assunções**: —
