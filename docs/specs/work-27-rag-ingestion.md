# WORK-27 — RAG ingestion (chunker + embeddings + endpoint reindex)

## Metadados

- `spec_id`: WORK-27
- `titulo_tecnico`: Chat RAG — Fase 2: ingestão do corpus (chunking Markdown, embeddings Gemini, upsert no pgvector)
- `source_product_spec`: `docs/05-rag-plan.md`
- `source_product_spec_version`: 1
- `baseline_branch_or_commit`: `master` após WORK-26 na branch `rag-integration`
- `target_branch`: `rag-integration` (mesma branch)
- `escopo_sistema`: financial (backend)
- `última_atualização`: 2026-08-23

## 1. Objective do documento

- Ler os arquivos do corpus (`docs/specs/*.md`, `docs/02-development-plan.md`, `docs/01-database-modeling.md`)
- Quebrar em chunks semanticamente coerentes (por seção `##` do Markdown, fallback fixo pra seções muito grandes)
- Gerar embedding de cada chunk via Gemini `text-embedding-004`
- Persistir em `chat_document_chunks` (deleta anterior por `source_path`, insere novos — reindexação idempotente)
- Expor endpoint `POST /api/chat/rag/reindex` que dispara o processo
- **Não cobre**: query/retrieval (WORK-28), UI (WORK-29)

## 2. System overview

- **Estado atual (pós WORK-26)**: infra pronta, tabela vazia
- **Estado alvo**: Diego chama `POST /api/chat/rag/reindex` e todo o corpus vira ~30-100 chunks embeddados no banco
- **Delta técnico**:
  - `MarkdownChunker` (util): parsing Markdown por seções + split se >800 tokens
  - `GeminiEmbeddingClient` (util): HTTP client pro endpoint `:embedContent`
  - `RagIngestionService` (service): orquestra scan + chunk + embed + persist
  - `ChatRagController` (controller): expõe `POST /api/chat/rag/reindex`
  - Path do corpus resolvido via config (`chat.rag.corpus-path`, default `/app/docs` no container)
- **Fora de escopo**: reindexação automática por watcher; caching de embeddings; delta ingestion (hoje re-embedar tudo, corpus é pequeno)
- **Restrições obrigatórias**:
  - Deve funcionar dentro do container Docker (arquivo do corpus tem que estar montado — ver seção 8)
  - Rate limit do Gemini free tier: 15 req/min, 1500 req/dia → chunker gera 30-100 embeddings, bem abaixo do limite; ainda assim, throttle simples (150ms entre chamadas) por segurança
  - Falha parcial (ex: 5º chunk falha) não deve deixar corpus em estado inconsistente → transação por arquivo: apaga tudo do source_path só quando conseguir embeddar todos os chunks daquele arquivo

## 3. Architecture design

- **Estratégia de chunking**:
  1. Lê arquivo Markdown
  2. Parseia headers `##` e `###` (level 2 e 3)
  3. Para cada seção: junta conteúdo até o próximo header do mesmo nível ou superior
  4. Se a seção resultante > `chunkMaxTokens` (default 800), split por parágrafo (linha em branco)
  5. Se um parágrafo ainda > `chunkMaxTokens`, split fixo por caracteres (~3200 chars ≈ 800 tokens)
  6. Preserva no metadata: `source_path` (relativo à raiz do projeto), `section` (título do header), `chunk_index` (contador linear)
- **Contagem de tokens**: aproximação `chars / 4` (padrão da industry). Não vale precisão exata — só pra decidir splits.
- **Chamada embedding**:
  - `POST https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={API_KEY}`
  - Body: `{ "content": { "parts": [ { "text": chunkContent } ] } }`
  - Response: `{ "embedding": { "values": [768 floats] } }`
  - Retry: 1 tentativa extra em caso de 429 ou 5xx (backoff 1s)
- **Persistência transacional**:
  - Loop por arquivo → em transação: `deleteBySourcePath` → embed cada chunk → `saveAll`
  - Se embed do arquivo X falhar (ex: 429 mesmo com retry), pula pro próximo arquivo (não corrompe os anteriores). Log de erro por arquivo.
- **Path do corpus dentro do container**:
  - Diretório `docs/` do host tem que estar montado como volume no container `backend`
  - Docker Compose passa `-v ./docs:/app/docs:ro` (read-only) — arquivos ficam disponíveis pro Java em `/app/docs`
- **Trade-offs**:
  - Chunker manual em vez de lib (ex: LangChain4j) → menos dep, controle total, escopo simples justifica
  - Reindex full sempre em vez de diff → corpus pequeno (~100KB total); diff traria complexidade sem ganho
  - `text-embedding-004` (768 dim) vs `text-embedding-large-exp` (3072 dim) → o small é o "estável e free"; large é experimental e caro. Vamos de small.

## 4. Data design

- **Sem mudança de schema** (herda WORK-26).
- **Uso da tabela**:
  - `deleteBySourcePath("docs/specs/work-05-salary.md")` limpa antes de reinserir
  - `saveAll(List<DocumentChunk>)` insere todos os chunks do arquivo em batch
- **Valores esperados**:
  - `chunk_index` sempre começa em 0 e é linear dentro do arquivo
  - `section` pode ser NULL quando o chunk é fallback fixo (ex: seção gigante fatiada)
  - `token_count` aproximado (chars/4)

## 5. Interface design

- **API**:

  | Método | Path | Descrição |
  |---|---|---|
  | `POST` | `/api/chat/rag/reindex` | Dispara reindex full. Retorna `ReindexResult`. |

- **Response body** (`ReindexResult`):
  ```json
  {
    "filesProcessed": 32,
    "chunksCreated": 187,
    "tookMs": 4820
  }
  ```

- **Errors**:
  - `503 CHAT_DISABLED` — se `GEMINI_API_KEY` não configurada
  - `500 CHAT_INGESTION_FAILED` — erro fatal (I/O, permissão de leitura do corpus)
  - `401` — user não autenticado
  - Erros parciais (arquivo X falhou) **não** dão 500 — são logados e a resposta reflete o total efetivo

## 6. Component design

### `CMP-01` MarkdownChunker

- Path: `com.financial.chat.util.MarkdownChunker`
- Método principal: `List<Chunk> chunk(String content, int maxTokens)`
- Record interno: `Chunk(String section, String content)` — sem `source_path` aqui (o service preenche)
- Regras:
  - Split por `##` no início da linha (level 2). Level 3 (`###`) fica dentro da seção pai.
  - Seções > maxTokens → split por `\n\n` (parágrafo)
  - Parágrafo > maxTokens → split fixo por caracteres

### `CMP-02` GeminiEmbeddingClient

- Path: `com.financial.chat.client.GeminiEmbeddingClient`
- Dependência: `ChatProperties`, `RestClient http = RestClient.create()`
- Método: `float[] embed(String text)`
- Chamada:
  ```java
  String uri = props.getGemini().getBaseUrl()
      + "/models/" + props.getGemini().getEmbeddingModel()
      + ":embedContent?key=" + props.getGemini().getApiKey();
  Map<String, Object> body = Map.of("content", Map.of("parts", List.of(Map.of("text", text))));
  Map<String, Object> resp = http.post().uri(uri).body(body).retrieve().body(Map.class);
  ```
- Retry: 1 tentativa após 1s em 429/5xx; log warn se falhar
- Falha final → `GeminiCallException` (RuntimeException)

### `CMP-03` RagIngestionService

- Path: `com.financial.chat.service.RagIngestionService`
- Método principal: `ReindexResult reindex()`
- Fluxo:
  1. Lê recursivamente arquivos `.md` de `chat.rag.corpus-path`
  2. Filtra pelos paths configurados (whitelist: `docs/specs/**`, `docs/02-development-plan.md`, `docs/01-database-modeling.md`; ignora template + gmail-integration-plan por ser meta)
  3. Pra cada arquivo:
     - Chunker.chunk(content, maxTokens)
     - Pra cada chunk: `embed()` (com throttle 150ms)
     - Em transação: `deleteBySourcePath` + `saveAll`
  4. Agrega totais e retorna `ReindexResult`
- Dependências: `MarkdownChunker`, `GeminiEmbeddingClient`, `DocumentChunkRepository`
- Path relativo: normaliza pra "docs/specs/xxx.md" (sem prefixo do container)
- Estado interno: `AtomicBoolean running` — bloqueia chamada concorrente (retorna 409 se já rodando)

### `CMP-04` ChatRagController

- Path: `com.financial.chat.controller.ChatRagController`
- Endpoint:
  ```java
  @PostMapping("/api/chat/rag/reindex")
  public ReindexResult reindex() {
      if (!props.isEnabled()) throw new ResponseStatusException(SERVICE_UNAVAILABLE, "chat desabilitado");
      return ingestionService.reindex();
  }
  ```

## 7. UI and interaction design

- Nada nesta WORK. Reindex é chamado manualmente via cURL/Postman.

## 8. Runtime and operations

- **Volume do corpus** no `docker-compose.yml` do serviço `backend`:
  ```yaml
  services:
    backend:
      volumes:
        - ../docs:/app/docs:ro
  ```
  Nota: o path relativo `../docs` depende do WORKDIR do compose. Diego valida na execução.
- **`application.yml`** (adicionar dentro do bloco chat já existente):
  ```yaml
  chat:
    rag:
      corpus-path: /app/docs
      corpus-whitelist:
        - "specs/**"
        - "02-development-plan.md"
        - "01-database-modeling.md"
      throttle-ms: 150
  ```
- **Config do container**: `chat.rag.corpus-path=/app/docs` tanto no dev (bare-metal) via override, quanto no container. Se rodar backend fora do Docker, sobrescrever pra `./docs`.
- **Log**: `INFO` a cada arquivo processado (path + n_chunks); `WARN` por arquivo que falhou; final: total processado
- **Não usa métrica** (sem Prometheus configurado no projeto)

## 9. Security, privacy and compliance

- **Endpoint só pra user autenticado** — herda do JWT filter do sistema
- **Sem rate limit próprio** — reindex é operação intencional, cara, feita raramente
- **Volume read-only** — Java só lê docs, nunca escreve nesse mount

## 10. Requirement mapping

### `REQ-27-01` Reindex full

- Aceite: `POST /api/chat/rag/reindex` retorna 200 com `filesProcessed > 0` e `chunksCreated > 0`
- Testes: manual (Diego chama endpoint)

### `REQ-27-02` Chunking preserva contexto

- Aceite: inspecionar tabela — chunks têm `section` preenchido pra seções pequenas; chunks de fallback têm `section = null`
- Testes: manual (query no DBeaver)

### `REQ-27-03` Idempotência

- Aceite: chamar reindex 2x → totais iguais na 2ª chamada; sem chunks duplicados
- Testes: manual

### `REQ-27-04` Falha parcial não corrompe

- Aceite: forçar 1 arquivo com nome inválido (simular I/O error) → outros arquivos são indexados normalmente
- Testes: manual (opcional — cenário raro)

### `REQ-27-05` Sistema desabilitado retorna 503

- Aceite: sem `GEMINI_API_KEY`, `POST /api/chat/rag/reindex` retorna 503
- Testes: manual

## 11. Implementation plan input

### `WORK-27A` Chunker

- Arquivo: `financial/src/main/java/com/financial/chat/util/MarkdownChunker.java`
- Sem deps novas (só stdlib)
- Validar: unit test com 3 casos (seção pequena, seção grande, arquivo sem headers)

### `WORK-27B` Embedding client

- Arquivo: `financial/src/main/java/com/financial/chat/client/GeminiEmbeddingClient.java`
- Depende: `ChatProperties`
- Validar: chamada manual via app rodando (embed uma frase, retorna 768 floats)

### `WORK-27C` Ingestion service + controller

- Arquivos:
  - `financial/src/main/java/com/financial/chat/service/RagIngestionService.java`
  - `financial/src/main/java/com/financial/chat/controller/ChatRagController.java`
- Depende: `WORK-27A`, `WORK-27B`, `DocumentChunkRepository`
- Validar: `POST /api/chat/rag/reindex` via cURL retorna ReindexResult

### `WORK-27D` docker-compose volume

- Arquivos: `financial/docker-compose.yml`, `docker-compose.dist.yml`
- Mudança: adiciona `../docs:/app/docs:ro` no serviço backend
- Validar: `docker exec financial-backend ls /app/docs/specs | head` mostra os arquivos

## 12. Test plan

- **Unit**:
  - `MarkdownChunkerTest`: 3 cenários (seção pequena / seção grande / sem headers)
- **Manual (Diego)**:
  - [ ] `curl -X POST http://localhost/api/chat/rag/reindex -b <cookie>` retorna JSON com totais
  - [ ] `SELECT source_path, count(*) FROM chat_document_chunks GROUP BY source_path` mostra distribuição por arquivo
  - [ ] `SELECT source_path, section, LEFT(content, 80) FROM chat_document_chunks LIMIT 10` mostra chunks legíveis
  - [ ] Chamar reindex 2x → contagens iguais (idempotência)
  - [ ] Chamar sem `GEMINI_API_KEY` → 503

## 13. Open items

- **Bloqueios**: Diego precisa da `GEMINI_API_KEY` no `.env` antes de testar
- **Riscos**:
  - Chunker pode gerar chunks muito pequenos em specs com muitas subseções → aceitável (tem `section` semanticamente coerente mesmo assim)
  - `text-embedding-004` free tier tem 1500 rpd — se Diego reindexar 10x seguidas com 150 chunks, chega em 1500 rpd; muito improvável, mas se acontecer, aguarda até meia-noite UTC
- **Decisões**:
  - Chunker manual (não LangChain4j)
  - Reindex full sem diff
  - Rate limit próprio ficou pra WORK-28 (endpoint de query, mais quente)
- **Assunções**:
  - O container roda com o volume `../docs:/app/docs:ro` mapeado. Se Diego rodar backend bare-metal (fora do docker), precisa ajustar `chat.rag.corpus-path`.
