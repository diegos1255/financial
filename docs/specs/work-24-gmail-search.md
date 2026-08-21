# WORK-24 — Gmail busca

## Metadados

- `spec_id`: WORK-24
- `titulo_tecnico`: Integração Gmail — Fase 6: busca de emails com query passthrough
- `source_product_spec`: `docs/03-gmail-integration-plan.md`
- `source_product_spec_version`: 1
- `baseline_branch_or_commit`: `master` após merge da WORK-23
- `target_branch`: `work-24-gmail-search`
- `escopo_sistema`: financial (endpoint) + financial-front (barra de busca + resultados)
- `última_atualização`: 2026-08-08

## 1. Objective do documento

- Habilitar busca de emails usando a query nativa do Gmail (operadores como `from:`, `subject:`, `has:attachment`, `after:2026/07/01`, texto livre)
- **Não cobre**: busca full-text local (Gmail já indexa); saved searches; sugestões automáticas de query

## 2. System overview

- **Estado atual (pós WORK-23)**: sistema tem inbox, ações, labels, envio. Sem busca.
- **Estado alvo**:
  - Endpoint `GET /api/gmail/search?q=xxx&pageToken=xxx` passa query direta pra Gmail API
  - Frontend com barra de busca no header da inbox
  - Resultados vêm numa "aba" ou visão especial (não interfere com abas fixas de categoria)
- **Delta técnico**:
  - Endpoint em `GmailSearchController` (novo)
  - Service `GmailSearchService`
  - UI: `SearchBar.tsx` + estado de "modo busca" na `GmailInboxPage`
- **Fora de escopo**: highlight de termos, saved queries, autosuggest de operadores

## 3. Architecture design

- **Query passthrough**: backend não valida sintaxe (Gmail API valida). Só sanitiza (max length, sem null bytes)
- **Escopo**: `q` é passado direto pra `messages.list(q=xxx)`. Gmail suporta:
  - `from:x@y.com`
  - `to:x`
  - `subject:...`
  - `label:LabelName`
  - `has:attachment`, `filename:pdf`, `has:drive`
  - `after:2026/07/01`, `before:...`
  - `is:unread`, `is:read`, `is:starred`
  - Texto livre
- **Trade-off**:
  - **Passthrough** vs parser interno → passthrough (menos código, aproveita poder do Gmail)
  - **Limit no server-side**: `q` max 500 chars (evita abuso)

## 4. Data design

- Sem tabela nova
- Reusa `ThreadSummary` do WORK-19

## 5. Interface design

- **API**:

  | Método | Path | Descrição |
  |---|---|---|
  | `GET` | `/api/gmail/search?q={query}&pageToken=xxx&pageSize=20` | busca; retorna `{ items: ThreadSummary[], nextPageToken?: string }` |

- **Errors**:
  - `INVALID_PAYLOAD` (400) — `q` vazio ou > 500 chars
  - `GMAIL_API_ERROR` (502) — falha upstream
  - `GMAIL_REAUTH_REQUIRED` (401)

## 6. Component design

### `CMP-01` GmailSearchService
- Path: `com.financial.gmail.service.GmailSearchService`
- Método: `PagedThreadsResponse search(String query, String pageToken, int pageSize)`
- Chama `gmailApiClient.listMessages(q=query, pageSize, pageToken)` e agrupa por threadId (mesmo do inbox)

### `CMP-02` GmailSearchController
- Endpoint §5

### `CMP-03` SearchBar.tsx
- Path: `src/pages/gmail/components/SearchBar.tsx`
- Input com placeholder: `"Buscar em Email (ex: from:contabilidade)"`
- Debounce 300ms → dispara busca automaticamente
- Botão "X" limpa e volta ao modo normal
- Sugestão de operadores em tooltip/dropdown (nice-to-have opcional)

### `CMP-04` GmailInboxPage (modificação)
- Novo estado: `searchQuery: string | null` (null = modo normal)
- Quando `searchQuery` não null, esconde sidebar de categorias e mostra "Resultados: {query}"
- Lista de threads da busca substitui a lista normal
- ESC ou clicar X sai do modo busca

### `CMP-05` gmailService (expandido)
- Método: `searchThreads(query, pageToken?)`

## 7. UI and interaction design

- **Barra de busca**: sempre visível no header da inbox
- **Modo busca ativo**: sidebar de categorias fica "opaca" ou some; título da lista vira "Resultados"
- **Empty state**: "Nenhum email encontrado para \"{query}\""

## 8. Runtime and operations

- Sem novas envs/deps
- Rate limit ok (usuário digita → debounce → 1 request por query)

## 9. Security, privacy and compliance

- **Query sanitization**: max length, sem null bytes ou CR/LF
- Sem armazenamento de queries (privacy)

## 10. Requirement mapping

### `REQ-24-01` Busca básica
- Aceite: digitar "boleto" → mostra threads com essa palavra em corpo/assunto

### `REQ-24-02` Operadores Gmail
- Aceite: `from:contabilidade` funciona, `has:attachment` funciona, `after:2026/07/01` funciona

### `REQ-24-03` Paginação nos resultados
- Aceite: se busca retornar >20, botão "Carregar mais" aparece

### `REQ-24-04` Sair da busca
- Aceite: clicar X ou ESC volta ao modo normal com a última aba selecionada

## 11. Implementation plan input

### `WORK-24A` Backend
- Arquivos:
  - `com/financial/gmail/service/GmailSearchService.java`
  - `com/financial/gmail/controller/GmailSearchController.java`
- Validar: `curl` com queries variadas

### `WORK-24B` Frontend
- Arquivos:
  - `src/pages/gmail/components/SearchBar.tsx`
  - Modificação de `GmailInboxPage`
  - `src/services/gmailService.ts`
- Validar: UX completo

## 12. Test plan

- **Manual (Diego)**:
  - [ ] Buscar `from:contabilidade` → só emails dela
  - [ ] Buscar `has:attachment` → só emails com anexo
  - [ ] Buscar `boleto after:2026/07/01` → combinação funciona
  - [ ] Query vazia → volta ao modo normal
  - [ ] Sem resultados → empty state
  - [ ] Paginação em 100+ resultados

## 13. Open items

- **Riscos**:
  - Debounce 300ms pode ser curto pra digitação lenta; ajustar se Diego reportar
- **Decisões**:
  - Autosuggest de operadores fica pra iteração futura
- **Assunções**: -
