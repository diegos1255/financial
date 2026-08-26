# WORK-28 — RAG query (retrieval + generation via Gemini Flash)

## Metadados

- `spec_id`: WORK-28
- `titulo_tecnico`: Chat RAG — Fase 3: endpoint de query com retrieval (pgvector) e generation (Gemini 1.5 Flash)
- `source_product_spec`: `docs/05-rag-plan.md`
- `source_product_spec_version`: 1
- `baseline_branch_or_commit`: `master` após WORK-27 na branch `rag-integration`
- `target_branch`: `rag-integration`
- `escopo_sistema`: financial (backend)
- `última_atualização`: 2026-08-23

## 1. Objective do documento

- Expor endpoint `POST /api/chat/query` que recebe uma pergunta em PT-BR e devolve resposta baseada no corpus
- Fluxo: embed da pergunta → similarity search no pgvector → montar prompt → Gemini Flash → parse resposta → devolver `answer + sources`
- Prompt engineering pra: (a) responder só sobre o Controle Financeiro, (b) sempre citar spec de origem, (c) recusar quando não achar contexto
- Endpoint `GET /api/chat/status` (retorna `{ enabled: bool }`) pra o widget saber se deve mostrar bolinha
- **Não cobre**: UI (WORK-29), streaming, persistência de histórico, feedback

## 2. System overview

- **Estado atual (pós WORK-27)**: corpus indexado no `chat_document_chunks`
- **Estado alvo**:
  - `POST /api/chat/query { question, sessionId? }` → `{ answer, sources: [{sourcePath, section, score}], tookMs }`
  - `GET /api/chat/status` → `{ enabled }`
  - Rate limit: 20 queries/hora por user
- **Delta técnico**:
  - `GeminiChatClient` (util): HTTP client pro endpoint `:generateContent`
  - `RagRetrievalService`: embed da pergunta + query native SQL usando `<=>` (cosine distance)
  - `ChatQueryService`: orquestra retrieval + prompt + generation
  - `ChatQueryController`: endpoint REST
  - `ChatStatusController`: endpoint status
  - Rate limit específico (Bucket4j) — 20/hora
- **Fora de escopo**: streaming SSE, sessão persistida, memória de conversação (cada query é standalone)
- **Restrições obrigatórias**:
  - Prompt sempre instrui recusa quando sem contexto ("não encontrei essa informação nas specs")
  - Nunca vazar chave da API
  - Fallback: se Gemini falhar (5xx), retornar 502 com mensagem clara — não retry infinito

## 3. Architecture design

- **Fluxo completo da query**:
  ```
  1. User envia POST /api/chat/query { question: "como cadastro salário?" }
  2. Controller valida (max 500 chars, sem CR/LF, sem null bytes)
  3. Rate limit filter passa
  4. ChatQueryService.answer(question):
     a. embed = geminiEmbedding.embed(question)   // 768 floats
     b. chunks = retrievalService.topK(embed, K=5, minScore=0.55)
        SQL: SELECT ..., 1 - (embedding <=> ?) AS score
             FROM chat_document_chunks
             WHERE 1 - (embedding <=> ?) >= ?
             ORDER BY embedding <=> ? ASC
             LIMIT ?
     c. Se chunks.isEmpty() → retorna resposta padrão "não encontrei..."
     d. prompt = buildPrompt(question, chunks)
     e. answer = geminiChat.generate(prompt)
     f. return ChatAnswer(answer, sources, took)
  5. Controller retorna JSON
  ```
- **Prompt template** (dentro do backend):
  ```
  Você é o assistente virtual do sistema "Controle Financeiro" — um sistema pessoal
  de finanças que o usuário Diego está construindo. Seu único papel é ajudar Diego
  a usar o sistema, respondendo perguntas sobre COMO fazer as coisas, quais campos
  preencher, onde estão os menus, e como funcionam as regras.

  Responda SEMPRE em português do Brasil, tom informal e direto.

  Regras estritas:
  1. Responda APENAS com base no contexto fornecido abaixo. Não invente campos, telas
     ou comportamentos que não estejam no contexto.
  2. Se o contexto não tem a resposta, diga:
     "Não encontrei essa informação nas specs. Talvez ainda não esteja documentado."
  3. Se a pergunta for sobre outro assunto (política, receitas, esportes, etc.),
     responda: "Eu só sei sobre o sistema Controle Financeiro."
  4. Ao final, cite quais specs você usou no formato: "Fontes: WORK-XX, WORK-YY"

  Contexto (trechos das specs do sistema):
  ---
  [chunk 1: source_path=docs/specs/work-05-salary.md section=Objetivo]
  <conteúdo do chunk>

  [chunk 2: source_path=... section=...]
  <conteúdo do chunk>

  ...
  ---

  Pergunta do usuário:
  {question}
  ```
- **Similarity metric**: cosine distance via `<=>` (pgvector). Score final: `1 - distance` (0 = idêntico oposto, 1 = idêntico) — inverte pra ficar intuitivo.
- **Fallback quando sem contexto suficiente**:
  - Se `chunks.isEmpty()` (nenhum acima do `minScore`), curta-circuita e retorna resposta fixa "não encontrei" — economiza chamada ao Gemini
  - `sources` fica lista vazia nesse caso
- **Trade-offs**:
  - Prompt em português no backend → menos flexibilidade i18n; aceitável (Diego é o único user)
  - Sem memória entre queries → cada pergunta é standalone; simplifica e economiza tokens
  - `sessionId` no request é só pra log (pra debugar depois se preciso); ignorado na lógica
  - Rate limit local (Bucket4j in-memory) e não Redis → suficiente pra 1 user

## 4. Data design

- **Sem mudança de schema**
- **Query native** no repository:
  ```java
  @Query(value = """
      SELECT id, source_path, section, chunk_index, content, token_count,
             1 - (embedding <=> CAST(:embedding AS vector)) AS score
      FROM chat_document_chunks
      WHERE 1 - (embedding <=> CAST(:embedding AS vector)) >= :minScore
      ORDER BY embedding <=> CAST(:embedding AS vector) ASC
      LIMIT :topK
      """, nativeQuery = true)
  List<Object[]> findSimilar(@Param("embedding") String embeddingLiteral,
                              @Param("minScore") double minScore,
                              @Param("topK") int topK);
  ```
  - `embeddingLiteral` é a serialização do float[] no formato pgvector (`'[0.1,0.2,...]'`)
  - Mapear `Object[]` pra record `RetrievedChunk(UUID id, String sourcePath, String section, String content, double score)` no service

## 5. Interface design

- **APIs**:

  | Método | Path | Descrição |
  |---|---|---|
  | `GET` | `/api/chat/status` | Retorna `{ enabled }` — se o chat pode ser usado |
  | `POST` | `/api/chat/query` | Faz uma query; retorna `ChatAnswer` |

- **Request** (`POST /api/chat/query`):
  ```json
  { "question": "como cadastro salário?", "sessionId": "abc123" }
  ```
- **Response 200**:
  ```json
  {
    "answer": "Pra cadastrar salário, entre no menu Salários...",
    "sources": [
      { "sourcePath": "docs/specs/work-05-salary.md", "section": "Objetivo", "score": 0.87 },
      { "sourcePath": "docs/specs/work-09-front-cruds-dashboard.md", "section": "SalaryFormModal", "score": 0.72 }
    ],
    "tookMs": 1240
  }
  ```
- **Errors**:
  - `400 INVALID_PAYLOAD` — pergunta > 500 chars ou vazia
  - `429 RATE_LIMIT_EXCEEDED` — mais de 20 queries/hora
  - `502 CHAT_UPSTREAM_FAILED` — falha do Gemini após retry
  - `503 CHAT_DISABLED` — sem `GEMINI_API_KEY`

## 6. Component design

### `CMP-01` GeminiChatClient

- Path: `com.financial.chat.client.GeminiChatClient`
- Método: `String generate(String prompt)`
- Chamada:
  ```java
  String uri = props.getGemini().getBaseUrl()
      + "/models/" + props.getGemini().getChatModel()
      + ":generateContent?key=" + props.getGemini().getApiKey();
  Map<String, Object> body = Map.of(
      "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))),
      "generationConfig", Map.of(
          "temperature", 0.2,
          "topP", 0.9,
          "maxOutputTokens", 1024
      )
  );
  ```
- Parse response: `resp.candidates[0].content.parts[0].text`
- Retry: 1 tentativa em 429/5xx (backoff 2s)
- Falha final → `GeminiCallException`

### `CMP-02` RagRetrievalService

- Path: `com.financial.chat.service.RagRetrievalService`
- Método: `List<RetrievedChunk> topK(float[] queryEmbedding)`
- Dependência: `DocumentChunkRepository`, `ChatProperties`
- Converte `float[]` pra formato pgvector `[0.1,0.2,...]` e chama query nativa
- Aplica `topK` e `minScore` do config

### `CMP-03` ChatQueryService

- Path: `com.financial.chat.service.ChatQueryService`
- Método: `ChatAnswer answer(String question)`
- Fluxo (ver seção 3)
- Log: `INFO` a cada query com question truncada + tookMs + nSources; `WARN` em fallback (0 chunks)

### `CMP-04` PromptBuilder

- Path: `com.financial.chat.util.PromptBuilder`
- Método: `String build(String question, List<RetrievedChunk> chunks)`
- Serializa chunks conforme template da seção 3
- Trunca contexto se soma dos chunks > 12k tokens (~48k chars) — precaução; free tier suporta 1M tokens de contexto, então improvável, mas cinto e suspensório

### `CMP-05` ChatQueryController

- Path: `com.financial.chat.controller.ChatQueryController`
- Endpoints:
  - `POST /api/chat/query` — recebe `ChatQueryRequest`, retorna `ChatAnswer`
  - `GET /api/chat/status` — retorna `{ enabled: chatProperties.isEnabled() }`
- Se `!enabled` no `POST /query` → `503 CHAT_DISABLED`

### `CMP-06` Rate limit filter

- Reusar `RateLimitFilter` existente (do módulo security)? Depende de como está estruturado.
- Alternativa mais simples: guard direto no controller com `Bucket4j` in-memory por `userId` (mesma abordagem do módulo security, mas escopo local)
- Configuração: 20 queries por hora
- Se estourar: `429 RATE_LIMIT_EXCEEDED`

## 7. UI and interaction design

- Nada nesta WORK.

## 8. Runtime and operations

- **Config** (adicionar em `application.yml`):
  ```yaml
  chat:
    query:
      rate-limit-per-hour: 20
      temperature: 0.2
      max-output-tokens: 1024
  ```
- **Log**:
  - Cada query: `INFO ChatQuery user=<id> question="<truncated 80 chars>" chunks=<N> tookMs=<X>`
  - Fallback (0 chunks): `WARN` + question completa
  - Gemini fail: `ERROR` + stack (usando log.error com throwable)

## 9. Security, privacy and compliance

- **Endpoint autenticado** — JWT filter herda
- **Rate limit** — 20/hora por user impede abuso e proteje free tier
- **Sanitização de input** — max 500 chars, sem null/CR/LF
- **Prompt injection**:
  - Risco baixo (só Diego usa)
  - Mitigação: prompt do sistema é forte ("Responda APENAS com base no contexto") + temperature 0.2
  - Não aplicar mitigations pesadas nesta fase

## 10. Requirement mapping

### `REQ-28-01` Query retorna resposta baseada em contexto

- Aceite: perguntar "como cadastro salário" → resposta cita caminho de menu, campos + Fontes: WORK-05
- Testes: manual

### `REQ-28-02` Query sem contexto retorna resposta padrão

- Aceite: perguntar "quem é o presidente do Brasil" → resposta "Eu só sei sobre o sistema Controle Financeiro"
- Testes: manual

### `REQ-28-03` Rate limit ativo

- Aceite: 21ª query em 1 hora → 429
- Testes: manual (ou skip; comportamento óbvio)

### `REQ-28-04` Status endpoint

- Aceite: `GET /api/chat/status` retorna `{ "enabled": true }` com API key configurada
- Testes: manual

## 11. Implementation plan input

### `WORK-28A` Chat client + retrieval

- Arquivos:
  - `financial/src/main/java/com/financial/chat/client/GeminiChatClient.java`
  - `financial/src/main/java/com/financial/chat/service/RagRetrievalService.java`
  - `financial/src/main/java/com/financial/chat/util/PromptBuilder.java`
- Depende: WORK-27 (embedding client + repository)
- Validar: chamar geminiChat com prompt fixo, ver retorno textual

### `WORK-28B` Query service + controller + rate limit

- Arquivos:
  - `financial/src/main/java/com/financial/chat/service/ChatQueryService.java`
  - `financial/src/main/java/com/financial/chat/controller/ChatQueryController.java`
  - `financial/src/main/java/com/financial/chat/controller/ChatStatusController.java` (ou combinar no query controller)
  - `financial/src/main/java/com/financial/chat/config/ChatProperties.java` (adicionar `query` section)
  - `financial/src/main/resources/application.yml` (adicionar `chat.query.*`)
- Validar: cURL com pergunta real, ver resposta com `sources`

## 12. Test plan

- **Unit**:
  - `PromptBuilderTest`: 2 cenários (chunks presentes; chunks vazios não deveriam chegar aqui — validar exception)
- **Manual (Diego)**:
  - [ ] `curl -X POST /api/chat/query -d '{"question":"como cadastro salário?"}'` retorna resposta útil + sources
  - [ ] Pergunta genérica ("qual a capital do Japão?") → resposta "Eu só sei sobre o sistema..."
  - [ ] Pergunta sobre feature não speccada (ex: "como uso o modo escuro?") → "Não encontrei essa informação..."
  - [ ] Fazer 21 queries seguidas → 21ª retorna 429
  - [ ] `GET /api/chat/status` retorna `{ enabled: true }` (ou false sem key)
  - [ ] Remover API key, restart, `POST /query` → 503

## 13. Open items

- **Bloqueios**: WORK-26 e WORK-27 devem estar fechadas e corpus indexado
- **Riscos**:
  - Quality do PT-BR do Gemini Flash em respostas curtas de menu — testar manualmente cedo. Se ficar ruim, ajustar temperature ou trocar pra `gemini-1.5-pro` (ainda no free tier em req/dia menor)
  - `<=>` cosine distance vs `<->` L2 vs `<#>` inner product — cosine é o padrão pra embeddings normalizados. Gemini normaliza automaticamente. OK.
- **Decisões**:
  - Prompt em PT-BR hardcoded no backend
  - Rate limit in-memory (não Redis)
  - Sem streaming
- **Assunções**:
  - Diego só faz uma pergunta por vez (sem paralelismo brutal)
