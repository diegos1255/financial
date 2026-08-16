# WORK-21 — Gmail ações (arquivar, lixeira, marcar não-lido, bulk)

## Metadados

- `spec_id`: WORK-21
- `titulo_tecnico`: Integração Gmail — Fase 3: ações em emails individuais e em lote
- `source_product_spec`: `docs/03-gmail-integration-plan.md`
- `source_product_spec_version`: 1
- `baseline_branch_or_commit`: `master` após merge da WORK-20
- `target_branch`: `work-21-gmail-actions`
- `escopo_sistema`: financial (endpoints) + financial-front (UI de ações)
- `última_atualização`: 2026-08-08

## 1. Objective do documento

- Habilitar ações em emails/threads: **arquivar**, **mover pra lixeira**, **marcar como não-lido**, e complementarmente **marcar como lido** (já existe do WORK-19, mas agora exposto como ação manual)
- Habilitar **seleção múltipla** com toolbar de ações em lote
- **Não cobre**: labels custom (WORK-22), enviar (WORK-23), busca (WORK-24), anexos (WORK-25)

## 2. System overview

- **Estado atual (pós WORK-20)**: inbox exibe threads, marca como lido ao abrir, badge/toast funcionam. Não há botão pra arquivar, deletar, ou marcar não-lido.
- **Estado alvo**:
  - 4 endpoints novos (`archive`, `trash`, `read`, `unread`) atuando em thread single
  - 1 endpoint `bulk` que aceita `{ action, threadIds }` — dispara múltiplas modifications em paralelo
  - UI da inbox ganha:
    - Botões de ação no header do painel de leitura (arquivar/lixeira/marcar não-lido)
    - Checkbox em cada `ThreadListItem`
    - Toolbar aparece quando qualquer checkbox está marcado, com botões de ação em lote
- **Delta técnico**:
  - Endpoints novos em `GmailInboxController` (ou novo `GmailActionsController`)
  - Serviço adiciona 4 métodos (archive/trash/read/unread) + `bulk`
  - Frontend: componente `SelectionToolbar.tsx`, estado de seleção no `GmailInboxPage`
- **Fora de escopo**: labels custom, undo, snooze

## 3. Architecture design

- **Semântica Gmail**:
  - **Arquivar** = remover label `INBOX`
  - **Lixeira** = `trash` endpoint (adiciona label `TRASH`, remove `INBOX`)
  - **Marcar lido** = remover label `UNREAD`
  - **Marcar não-lido** = adicionar label `UNREAD`
- **Endpoint bulk**:
  - Recebe até 100 IDs por request (limitação sensata)
  - Executa modifications em paralelo (`CompletableFuture.allOf`), max 10 concurrent
  - Retorna `{ successCount, failedIds }` — front decide como reportar
- **Cache invalidation**:
  - Depois de qualquer ação, invalida o cache `gmail-unread-summary` do user (força próximo polling refazer count)
- **Trade-offs**:
  - **Sem confirmação nativa** pra trash → adicionamos ConfirmModal no front (padrão do resto do sistema)
  - **Bulk paralelo vs sequencial** → paralelo com limite. Gmail API não tem batch nativo pra `messages.modify`, mas suporta muitas requests concorrentes até o quota

## 4. Data design

- **Nenhuma tabela nova**
- **Request DTOs**:
  ```java
  record BulkActionRequest(
    @NotNull GmailBulkAction action,   // ARCHIVE, TRASH, READ, UNREAD
    @NotEmpty @Size(max=100) List<String> threadIds
  ) {}

  record BulkActionResponse(
    int successCount,
    List<String> failedIds
  ) {}
  ```

## 5. Interface design

- **APIs REST**:

  | Método | Path | Descrição |
  |---|---|---|
  | `POST` | `/api/gmail/threads/{id}/archive` | remove `INBOX` |
  | `POST` | `/api/gmail/threads/{id}/trash` | move pra lixeira |
  | `POST` | `/api/gmail/threads/{id}/read` | remove `UNREAD` |
  | `POST` | `/api/gmail/threads/{id}/unread` | adiciona `UNREAD` |
  | `POST` | `/api/gmail/threads/bulk` | `BulkActionRequest` → `BulkActionResponse` |

- **Errors**:
  - 400 se thread já está no estado (opcional; ou aceitar idempotente)
  - `GMAIL_REAUTH_REQUIRED` (401)
  - `GMAIL_API_ERROR` (502) em falha upstream

- **Idempotência**: todas as operações são idempotentes (arquivar já arquivado = no-op).

## 6. Component design

### `CMP-01` GmailActionsService
- Path: `com.financial.gmail.service.GmailActionsService`
- Métodos:
  - `void archive(String threadId)` → `modifyThread(add=[], remove=[INBOX])`
  - `void trash(String threadId)` → chamada explícita ao endpoint `trash` do Gmail (não via labels)
  - `void markAsRead(String threadId)` → remove `UNREAD`
  - `void markAsUnread(String threadId)` → adiciona `UNREAD`
  - `BulkActionResponse bulkExecute(BulkActionRequest req)` — paralelo com `Executors.newFixedThreadPool(10)`
- Cada method invalida o cache `gmail-unread-summary` do user via `CacheManager.getCache(...).evict(userId)`

### `CMP-02` GmailActionsController (novo, separando do Inbox)
- Path: `com.financial.gmail.controller.GmailActionsController`
- Endpoints §5

### `CMP-03` SelectionToolbar.tsx
- Path: `src/pages/gmail/components/SelectionToolbar.tsx`
- Props: `{ selectedCount, onArchive, onTrash, onMarkUnread, onClear }`
- Aparece com transição suave (slide down) sempre que `selectedCount > 0`
- Botões: Arquivar / Lixeira (com confirm) / Marcar não-lido / Limpar seleção
- Estilo: barra sticky no top da lista com `bg-accent-soft`

### `CMP-04` ThreadListItem (modificação)
- Adiciona checkbox à esquerda
- Ao clicar checkbox: NÃO abre thread; só toggle seleção
- Estado de seleção sobe pro `GmailInboxPage`

### `CMP-05` ThreadViewer (modificação)
- Adiciona botões no header: Arquivar / Lixeira / Marcar não-lido
- Após ação, fecha viewer e refetch da lista

### `CMP-06` gmailService (expandido)
- Métodos: `archiveThread`, `trashThread`, `markThreadUnread`, `bulkAction`

### `CMP-07` GmailInboxPage (modificação)
- Estado: `selectedThreadIds: Set<string>`
- Handler pra toolbar chamar bulk + invalidate cache local + refresh
- Feedback: toast "3 conversas arquivadas" após bulk sucedido

## 7. UI and interaction design

- **Layout do painel de leitura pós-modificação**:
  ```
  ┌───────────────────────────────────────────────┐
  │ Subject da thread          [📥] [🗑] [📩] [↩] │  ← ações
  ├───────────────────────────────────────────────┤
  │ Corpo dos emails                              │
  └───────────────────────────────────────────────┘
  ```
- **Confirm modal** pra trash: "Mover 3 conversas pra lixeira?"
- **Otimistic UI**: quando arquiva, sumir da lista imediatamente; se backend falhar, revert + toast erro
- **Undo**: fora de escopo (nice-to-have futuro)

## 8. Runtime and operations

- Nada muda em config/deploy
- Cache invalidation: reusa `CacheManager` já em uso

## 9. Security, privacy and compliance

- Todos os endpoints protegidos por JWT + CSRF (padrão)
- Ownership implícito: user só modifica threads da própria conta Gmail (Gmail API garante — refresh_token é do próprio user)

## 10. Requirement mapping

### `REQ-21-01` Ações single
- Aceite: 4 botões no viewer funcionam; verificar no Gmail Web que estado mudou
- Testes: manual

### `REQ-21-02` Seleção múltipla + bulk
- Aceite: selecionar 5, clicar arquivar → todos somem em ≤2s, badge atualiza
- Testes: manual

### `REQ-21-03` Trash com confirmação
- Aceite: clicar trash abre modal; cancelar não faz nada
- Testes: manual

### `REQ-21-04` Optimistic UI + rollback
- Aceite: em caso de erro backend, thread reaparece na lista + toast de erro
- Testes: forçar erro simulando 502 do Google

## 11. Implementation plan input

### `WORK-21A` Backend
- Arquivos:
  - `com/financial/gmail/service/GmailActionsService.java`
  - `com/financial/gmail/controller/GmailActionsController.java`
  - DTOs em `com/financial/gmail/dto/actions/*`
  - Enum `GmailBulkAction`
- Validar: `curl` em cada endpoint

### `WORK-21B` Frontend
- Arquivos:
  - `src/pages/gmail/components/SelectionToolbar.tsx`
  - Modificação de `ThreadListItem`, `ThreadViewer`, `GmailInboxPage`
  - `src/services/gmailService.ts` (métodos novos)
- Validar: UX completo no browser

## 12. Test plan

- **Manual (Diego)**:
  - [ ] Arquivar single: thread some da inbox, aparece em "All Mail" no Gmail Web
  - [ ] Trash single: modal aparece, confirma, thread vai pra lixeira
  - [ ] Marcar não-lido: badge aumenta em até 30s
  - [ ] Selecionar 3 + arquivar em lote: sucesso
  - [ ] Selecionar 10 + trash: modal, confirma, todos vão
  - [ ] Erro forçado: thread reaparece com toast de erro

## 13. Open items

- **Riscos**:
  - Undo seria valioso mas complica (precisa memorizar estado anterior); deixar fora
  - Concorrência: 10 requests paralelas no Gmail API — verificar se estoura quota do user (250 units/s/user). Cada `modifyThread` = 5 units. 10 × 5 = 50 units. OK
- **Decisões pendentes**:
  - Confirm também pra archive? Diego decide na hora da UI
- **Assunções**: -
