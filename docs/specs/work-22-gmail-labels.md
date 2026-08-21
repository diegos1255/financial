# WORK-22 — Gmail labels customizadas

## Metadados

- `spec_id`: WORK-22
- `titulo_tecnico`: Integração Gmail — Fase 4: CRUD de labels custom + mover emails
- `source_product_spec`: `docs/03-gmail-integration-plan.md`
- `source_product_spec_version`: 1
- `baseline_branch_or_commit`: `master` após merge da WORK-21
- `target_branch`: `work-22-gmail-labels`
- `escopo_sistema`: financial (endpoints) + financial-front (sidebar de labels + modal + botão mover)
- `última_atualização`: 2026-08-08

## 1. Objective do documento

- Habilitar CRUD de labels custom no Gmail (criar, renomear, deletar)
- Habilitar "mover" emails/threads pra labels custom
- Sidebar da inbox mostra labels custom além das 3 categorias já existentes
- **Não cobre**: nested labels (com `/` no nome, ex: `Impostos/DAS`) na primeira iteração; opcional futuramente

## 2. System overview

- **Estado atual (pós WORK-21)**: 3 abas fixas de categorias. Nenhuma noção de labels custom.
- **Estado alvo**:
  - Endpoints CRUD de labels
  - Endpoint pra listar todas as labels (custom + sistema)
  - Endpoint pra adicionar/remover labels em uma thread
  - Sidebar da inbox tem 2 seções: **Categorias** (Principal/Promoções/Atualizações) e **Labels** (custom)
  - Clicar em uma label custom lista threads com essa label
  - Botão "Mover pra label" no viewer com dropdown
- **Delta técnico**:
  - Endpoints em `GmailLabelsController`
  - Service `GmailLabelsService`
  - Sidebar da inbox refatorada pra suportar seções
  - Modal simples pra criar/renomear
- **Fora de escopo**: nested labels, colorir labels no sistema (Gmail suporta, mas UX secundário)

## 3. Architecture design

- **Modelo Gmail**:
  - Label tem `id`, `name`, `type` (`system` | `user`), `messageListVisibility`, `labelListVisibility`
  - Categorias (`CATEGORY_PERSONAL` etc.) e labels do sistema (`INBOX`, `UNREAD`, `STARRED`, `IMPORTANT`, `SENT`, `SPAM`, `TRASH`, `DRAFT`, `CATEGORY_*`) são type `system` — não podem ser modificadas/deletadas
  - Labels custom criadas pelo user são type `user`
- **Endpoint "mover" = "adicionar label + remover INBOX"**?
  - Gmail não tem noção de "mover" — só labels. Mas o UX comum é: mover = adicionar label custom + remover INBOX (arquivar da inbox).
  - Nossa API: **`POST /api/gmail/threads/{id}/labels`** com `{ add: [...], remove: [...] }` — cliente decide semântica
- **Cache labels**: labels mudam raramente. Cachear lista por 5min por user

## 4. Data design

- Sem tabela nova
- DTOs:
  ```java
  record LabelSummary(
    String id,
    String name,
    String type,       // "system" | "user"
    Integer messagesUnread,   // opcional (só quando pediu com stats)
    Integer messagesTotal     // opcional
  ) {}

  record CreateLabelRequest(
    @NotBlank @Size(max=100) String name
  ) {}

  record RenameLabelRequest(
    @NotBlank @Size(max=100) String newName
  ) {}

  record ModifyLabelsRequest(
    @NotNull List<String> add,
    @NotNull List<String> remove
  ) {}
  ```

## 5. Interface design

| Método | Path | Descrição |
|---|---|---|
| `GET` | `/api/gmail/labels?includeStats=true\|false` | lista labels; se `includeStats`, inclui `messagesUnread`/`messagesTotal` |
| `POST` | `/api/gmail/labels` | cria label (nome). 409 se já existe |
| `PATCH` | `/api/gmail/labels/{id}` | renomeia. 400 se tentar renomear system label |
| `DELETE` | `/api/gmail/labels/{id}` | deleta. 400 se tentar deletar system label |
| `POST` | `/api/gmail/threads/{id}/labels` | `ModifyLabelsRequest` — add/remove labels na thread |
| `GET` | `/api/gmail/threads?labelId=xxx&pageToken=xxx` | lista threads por label (extensão do endpoint existente do WORK-19 — ganha param `labelId`) |

## 6. Component design

### `CMP-01` GmailLabelsService
- Métodos: `list(includeStats)`, `create(name)`, `rename(id, newName)`, `delete(id)`, `modifyThreadLabels(threadId, add, remove)`
- Cache `gmail-labels` (Caffeine, 5min, size 100)
- Invalidar cache em cada create/rename/delete

### `CMP-02` GmailLabelsController
- Endpoints §5

### `CMP-03` GmailInboxController (modificação)
- Endpoint `GET /threads` aceita `labelId` opcional
- Se `labelId` presente, `q` do Gmail vira `label:{labelName}` (não usar `labelIds` param pra evitar conflito com category)

### `CMP-04` GmailInboxPage (refactor da sidebar)
- Sidebar dividida em 2 seções:
  ```
  📥 Caixa de entrada
     • Principal
     • Promoções
     • Atualizações
  🏷 Labels
     • Impostos
     • Contabilidade
     • [+ Nova label]
  ```
- Estado ativo: `{ type: 'category' | 'label', value: string }`
- Clique em label custom: chama `/threads?labelId=xxx`

### `CMP-05` LabelFormModal
- Path: `src/pages/gmail/components/LabelFormModal.tsx`
- Modo criar/renomear
- Campo nome + validação (não vazio, max 100 chars)
- Botão salvar/cancelar

### `CMP-06` LabelPicker
- Path: `src/pages/gmail/components/LabelPicker.tsx`
- Botão no `ThreadViewer` com dropdown de labels
- Checkboxes por label (adiciona/remove ao marcar)
- Botão "Aplicar" chama `POST /threads/{id}/labels`

### `CMP-07` gmailService (expandido)
- Métodos: `listLabels`, `createLabel`, `renameLabel`, `deleteLabel`, `modifyThreadLabels`

## 7. UI and interaction design

- **Sidebar da inbox** ganha seção "Labels" com hover-to-show ações (ícone lápis + lixeira ao passar mouse)
- **Botão "+ Nova label"** no rodapé da seção
- **Confirm** pra deletar label (com aviso: "As threads com essa label não serão apagadas, só perdem a marcação")
- **Label picker no viewer**: aparece como popover ancorado a um botão "🏷 Labels" no header do viewer

## 8. Runtime and operations

- Sem novas envs/deps
- Cache Caffeine adicionado (`gmail-labels`)

## 9. Security

- Nada especial além do padrão JWT + CSRF

## 10. Requirement mapping

### `REQ-22-01` Listar labels
- Aceite: sidebar mostra labels custom reais do Gmail

### `REQ-22-02` Criar label
- Aceite: criar "Impostos" via UI, aparece imediatamente no sidebar. Verificar no Gmail Web

### `REQ-22-03` Renomear label
- Aceite: renomear "Impostos" → "Fiscal". Threads antigas mantêm associação

### `REQ-22-04` Deletar label
- Aceite: deletar "Fiscal" → some do sidebar. Threads que tinham a label não somem, só perdem a marcação

### `REQ-22-05` Mover email pra label
- Aceite: no viewer, escolher label custom, checkbox → aplicar. Thread aparece na label

### `REQ-22-06` Listar threads por label
- Aceite: clicar label custom mostra só threads com ela

## 11. Implementation plan input

### `WORK-22A` Backend
- Arquivos:
  - `com/financial/gmail/service/GmailLabelsService.java`
  - `com/financial/gmail/controller/GmailLabelsController.java`
  - DTOs em `com/financial/gmail/dto/labels/*`
  - Ajuste em `GmailInboxController` (param `labelId`)
- Validar: `curl` CRUD funciona

### `WORK-22B` Frontend
- Arquivos:
  - `src/pages/gmail/components/LabelFormModal.tsx`
  - `src/pages/gmail/components/LabelPicker.tsx`
  - Refactor `GmailInboxPage` (sidebar com seções)
  - `src/services/gmailService.ts`
- Validar: UX completo

## 12. Test plan

- **Manual (Diego)**:
  - [ ] Criar label "Teste"
  - [ ] Renomear pra "Teste2"
  - [ ] Aplicar label a 2 threads
  - [ ] Clicar "Teste2" no sidebar → só as 2 threads
  - [ ] Deletar label → some do sidebar; threads antigas continuam na inbox

## 13. Open items

- **Riscos**:
  - Gmail API não permite label com nome de system label (`INBOX`, etc.) — retorna 400. Front deve validar antes ou tratar erro
  - Nested labels (`Pai/Filho`) são suportadas pela API; UI trata como flat pra simplicidade nesta fase
- **Decisões**:
  - Cor da label: Gmail suporta mas não vamos expor no MVP
- **Assunções**: -
