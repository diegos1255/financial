# WORK-19 — Gmail inbox básico

## Metadados

- `spec_id`: WORK-19
- `titulo_tecnico`: Integração Gmail — Fase 1: leitura de emails (inbox por categoria, thread view, mark as read)
- `source_product_spec`: `docs/03-gmail-integration-plan.md`
- `source_product_spec_version`: 1
- `baseline_branch_or_commit`: `master` após merge da WORK-18
- `target_branch`: `work-19-gmail-inbox`
- `escopo_sistema`: financial (backend) + financial-front
- `última_atualização`: 2026-08-08

## 1. Objective do documento

- Substituir a página gate da WORK-18 por um **inbox funcional** com 3 abas (Principal / Promoções / Atualizações)
- Listar threads paginados, abrir thread pra ver conteúdo (HTML sanitizado)
- Marcar automaticamente como lido quando abre a thread
- **Não cobre**: envio, ações em lote, labels custom, notificações. Só leitura.

## 2. System overview

- **Estado atual (pós WORK-18)**: sistema tem tokens OAuth persistidos e refresh funcional. UI é só uma página de status.
- **Estado alvo**:
  - Backend com service `GmailApiClient` que encapsula chamadas à Gmail API v1 (via RestClient), reusando `GmailAuthService.getValidAccessToken`
  - 3 endpoints novos: listar threads por categoria, ler thread, marcar como lido
  - Frontend com layout de cliente de email: sidebar de categorias (3 abas), lista de threads, painel de leitura
  - HTML sanitizado com DOMPurify no frontend
- **Delta técnico**:
  - Novos endpoints em `GmailInboxController`
  - Novo service `GmailApiClient`
  - DTOs `ThreadSummary`, `ThreadDetail`, `MessageDetail`
  - Frontend: `GmailInboxPage.tsx` substituindo `GmailConnectPage` na rota `/email` (a page de conexão vira modal ou é escondida atrás de "não conectado")
  - Nova dep frontend: `dompurify` + `@types/dompurify`
- **Fora de escopo**: envio, ações, labels custom, busca, anexos
- **Restrições**:
  - Não sincroniza localmente (sempre pull direto da API)
  - Cache em memória no front (evita refetch ao trocar de aba se já carregado)
  - Sanitize antes de renderizar HTML

## 3. Architecture design

- **`GmailApiClient` centraliza toda chamada à Gmail API v1**:
  - Injeta `Authorization: Bearer {accessToken}` obtido de `GmailAuthService.getValidAccessToken(userId)`
  - Se receber 401 do Google → tenta refresh + retry uma vez
  - Se refresh falhar → propaga `GmailReauthRequiredException` (→ 401 pro front com code `GMAIL_REAUTH_REQUIRED`)
- **Formato de dados Gmail API**:
  - `threads.list` retorna array de `{id, snippet, historyId}` — precisa fetch de cada thread pra ver mensagens
  - **Otimização**: usar `messages.list` com filtro por label ao invés de `threads.list` — resposta já traz o payload básico com uma única chamada `messages.list(labelIds=[CATEGORY_PERSONAL], q="in:inbox")` + `format=metadata` (só headers)
  - Pra abrir uma thread individual, `threads.get` traz todas as mensagens com formato `full` (incluindo `payload.parts` com body)
- **Paginação**:
  - Gmail retorna `nextPageToken` na resposta
  - Frontend guarda `nextPageToken` no state e passa como query param `pageToken` no próximo `messages.list`
- **HTML sanitization**:
  - Backend não mexe no HTML (retorna raw base64-decoded)
  - Frontend usa DOMPurify: `<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />`
- **Trade-offs**:
  - **Sem cache no backend** (v1) → simplifica; se um dia virar problema, adiciona Redis com TTL curto
  - **Cache in-memory no front** (por sessão) → guarda threads/messages já carregados; refresh manual pelo user
  - **Marcar como lido eager** (no clique) → UX responsiva; se falhar, front reverte

## 4. Data design

- **Nenhuma nova tabela** — dados vem da Gmail API on-demand
- **DTOs** (mapeamento parcial do que Gmail API retorna):

  ```java
  record ThreadSummary(
    String id,
    String snippet,
    String from,          // "Nome <email@x>" extraído do header From
    String subject,
    OffsetDateTime date,  // parseado do header Date
    boolean unread,       // true se qualquer msg da thread tem label UNREAD
    int messageCount
  ) {}

  record ThreadDetail(
    String id,
    String subject,
    List<MessageDetail> messages
  ) {}

  record MessageDetail(
    String id,
    String from,
    List<String> to,
    List<String> cc,
    OffsetDateTime date,
    String bodyHtml,      // extraído de payload.parts (preferindo text/html; fallback text/plain)
    List<String> labelIds,
    boolean unread
  ) {}
  ```

## 5. Interface design

- **Categorias Gmail (constantes)**:
  - `PRIMARY` → label `CATEGORY_PERSONAL`
  - `PROMOTIONS` → `CATEGORY_PROMOTIONS`
  - `UPDATES` → `CATEGORY_UPDATES`

- **APIs REST**:

  | Método | Path | Descrição |
  |---|---|---|
  | `GET` | `/api/gmail/threads?category=PRIMARY\|PROMOTIONS\|UPDATES&pageToken=xxx&pageSize=20` | Lista threads. Retorna `{ items: ThreadSummary[], nextPageToken?: string }` |
  | `GET` | `/api/gmail/threads/{id}` | Retorna `ThreadDetail` |
  | `POST` | `/api/gmail/threads/{id}/read` | Remove label `UNREAD` de todas as mensagens da thread |

- **Errors**:
  - `GMAIL_REAUTH_REQUIRED` (401) — refresh token inválido; front redireciona pra `/email/connect`
  - `GMAIL_API_ERROR` (502) — erro upstream do Google (rate limit, 500 deles, etc.)
  - `GMAIL_NOT_CONNECTED` (404) — user não tem `GmailCredential`

- **Query passada ao Gmail API** (interna, não exposta no contrato):
  - `q = "in:inbox category:{PERSONAL|PROMOTIONS|UPDATES}"`
  - `labelIds = [INBOX, CATEGORY_XXX]` (redundante mas garante)

## 6. Component design

### `CMP-01` GmailApiClient
- Path: `com.financial.gmail.api.GmailApiClient`
- Métodos:
  - `MessagesListResponse listMessages(UUID userId, String query, List<String> labelIds, int pageSize, String pageToken)`
  - `Message getMessage(UUID userId, String messageId, String format)` — format: `metadata` | `full`
  - `Thread getThread(UUID userId, String threadId, String format)`
  - `void modifyMessage(UUID userId, String messageId, List<String> addLabels, List<String> removeLabels)`
  - `void modifyThread(UUID userId, String threadId, List<String> addLabels, List<String> removeLabels)`
- Internamente usa `RestClient`; injeta bearer token; trata 401 → refresh → retry

### `CMP-02` GmailInboxService
- Path: `com.financial.gmail.service.GmailInboxService`
- Métodos:
  - `PagedThreadsResponse listThreads(GmailCategory category, String pageToken, int pageSize)`
  - `ThreadDetail getThread(String threadId)`
  - `void markThreadAsRead(String threadId)`
- Faz agregação: `listMessages` + para cada messageId, um `getMessage(format=metadata)` (parallel) → monta `ThreadSummary` agrupando por `threadId`
- **Otimização**: batch request do Gmail API pra pegar múltiplas messages numa call (`batch endpoint`)

### `CMP-03` GmailInboxController
- Path: `com.financial.gmail.controller.GmailInboxController`
- `@RequestMapping("/api/gmail")`
- Endpoints §5

### `CMP-04` MessageParser (utilitário)
- Path: `com.financial.gmail.util.MessageParser`
- Métodos:
  - `String extractHeader(Message msg, String headerName)` — case-insensitive
  - `String extractHtmlBody(MessagePart payload)` — DFS na árvore de parts procurando `mimeType == "text/html"`; fallback `text/plain` convertido pra HTML simples
  - `OffsetDateTime parseDate(String rfc822Date)` — parse do header Date com fallback pra `internalDate` da API

### `CMP-05` GmailReauthRequiredException + handler
- Nova exception em `com.financial.gmail.exception`
- Handler no `ApiErrorHandler` → 401 com code `GMAIL_REAUTH_REQUIRED`

### `CMP-06` GmailInboxPage.tsx
- Path: `src/pages/gmail/GmailInboxPage.tsx`
- Layout:
  ```
  ┌────────────────────────────────────────────────┐
  │ Header: título + email conectado + refresh btn │
  ├──────────────┬─────────────────────────────────┤
  │ Sidebar      │ Lista de threads (esquerda)     │
  │ [Principal]  │ ─────────────────────────────── │
  │ [Promoções]  │ Painel de leitura (direita)     │
  │ [Atualizações]│                                │
  └──────────────┴─────────────────────────────────┘
  ```
- Estados:
  - Aba ativa (`PRIMARY` | `PROMOTIONS` | `UPDATES`)
  - Cache local: `Record<category, { threads: ThreadSummary[], nextPageToken?: string, loaded: boolean }>`
  - Thread selecionada (id + dados carregados)
- Comportamentos:
  - Ao trocar aba: se ainda não carregou, faz fetch; senão usa cache
  - Ao clicar thread: fetch de detalhe, marca como lido (otimista + backend)
  - Botão "Carregar mais" no final da lista se `nextPageToken` existir
  - Botão refresh no header limpa cache e refetch da aba atual

### `CMP-07` ThreadListItem.tsx
- Path: `src/pages/gmail/components/ThreadListItem.tsx`
- Renderiza: from bold (se unread), subject, snippet truncado, data formatada
- Estilo: `bg-blue-50` sutil se `unread`; `bg-white` se lido

### `CMP-08` ThreadViewer.tsx
- Path: `src/pages/gmail/components/ThreadViewer.tsx`
- Recebe `ThreadDetail`, renderiza cada mensagem como card colapsável (última expandida por default)
- Body HTML via DOMPurify

### `CMP-09` gmailService.ts (expandido)
- Novos métodos:
  - `listThreads(category, pageToken?)`
  - `getThread(id)`
  - `markThreadAsRead(id)`

### `CMP-10` App.tsx / RouteGuard
- Se user não conectou Gmail (fetch `/api/gmail/status` retorna `connected: false`), `/email` mostra `GmailConnectPage` (da WORK-18); caso contrário mostra `GmailInboxPage`
- Componente wrapper `GmailGate` que faz o roteamento condicional

## 7. UI and interaction design

- **Rota** `/email` fica dinâmica (gate ou inbox)
- **Estados visuais** da inbox:
  - Loading (fetch inicial): skeleton na lista de threads
  - Vazia: "Nenhum email nesta categoria"
  - Com dados: lista renderizada
  - Selecionada mas nada renderizado: placeholder "Selecione uma conversa"
  - Reauth necessário: card centralizado com botão "Reconectar Gmail"
- **Responsividade**: em mobile, esconde sidebar de categorias e vira dropdown; painel de leitura vira modal fullscreen
- **Acessibilidade**:
  - Setas ↑↓ navegam entre threads (nice-to-have)
  - `aria-label` no thread item com from + subject

## 8. Runtime and operations

- **Sem novas env vars**
- **Sem novos deps backend** (RestClient já vem no Spring 6)
- **Novo dep frontend**:
  ```json
  "dompurify": "^3.1.0",
  "@types/dompurify": "^3.0.5"
  ```
- **Config**: nada muda
- **Rollout**: build + up padrão

## 9. Security, privacy and compliance

- **HTML sanitization obrigatória**: DOMPurify config padrão + `SAFE_FOR_TEMPLATES: false`, `ALLOWED_ATTR` sem `on*` (defaults já fazem isso)
- **Nenhum caminho onde HTML raw chega ao DOM**: enforced via lint rule (opcional) ou code review manual
- **Bearer token nunca vai pro frontend**: fica sempre no backend
- **Rate limit interno**: opcional pra evitar user malicioso spammear o backend (mesmo padrão de rate limit já existente com Bucket4j)

## 10. Requirement mapping

### `REQ-19-01` Listar threads por categoria
- Aceite: 3 abas funcionam, cada uma lista 20 threads da respectiva categoria com paginação
- Testes: manual + integration

### `REQ-19-02` Abrir e ler thread
- Aceite: clica thread → painel de leitura mostra corpo com HTML seguro
- Testes: manual (E2E com email real)

### `REQ-19-03` Marcar como lido
- Aceite: abrir thread não-lida → após 1s, badge some, backend recebe POST read
- Testes: manual + verificar no Gmail Web que ficou lido

### `REQ-19-04` Refresh de token transparente
- Aceite: com access_token expirado forçadamente, próxima chamada refresha automaticamente
- Testes: unit no `GmailApiClient` (mock 401 → refresh path)

## 11. Implementation plan input

### `WORK-19A` Backend (client + service + controller)
- Arquivos:
  - `com/financial/gmail/api/GmailApiClient.java`
  - `com/financial/gmail/service/GmailInboxService.java`
  - `com/financial/gmail/controller/GmailInboxController.java`
  - `com/financial/gmail/util/MessageParser.java`
  - DTOs em `com/financial/gmail/dto/inbox/*`
  - `com/financial/gmail/exception/GmailReauthRequiredException.java` + handler em `ApiErrorHandler`
- Validar: `curl` autenticado retorna threads reais

### `WORK-19B` Frontend
- Arquivos:
  - `src/pages/gmail/GmailInboxPage.tsx`
  - `src/pages/gmail/components/ThreadListItem.tsx`
  - `src/pages/gmail/components/ThreadViewer.tsx`
  - `src/pages/gmail/components/GmailGate.tsx`
  - `src/services/gmailService.ts` (expandido)
  - `src/types/gmail.ts`
  - `package.json` (add dompurify)
- Validar: browser mostra emails reais do Diego

## 12. Test plan

- **Unit**: `MessageParser.extractHtmlBody`, `GmailApiClient` refresh-on-401
- **Integration**: `GmailInboxController` com mock do `GmailApiClient`
- **Manual (Diego)**:
  - [ ] Ver 3 abas populadas com emails reais
  - [ ] Trocar de aba com cache (segunda vez é instantânea)
  - [ ] Abrir email, ler conteúdo, HTML renderizado corretamente (imagens embutidas OK, links funcionam, sem execução de JS)
  - [ ] Badge unread some após abrir
  - [ ] Verificar no Gmail Web que o email ficou lido
  - [ ] "Carregar mais" no final da lista funciona
  - [ ] Refresh manual limpa e recarrega

## 13. Open items

- **Bloqueios**: precisa WORK-18 mergeada
- **Riscos**:
  - HTML de emails complexos (Outlook, Bootstrap-mail, etc.) pode ter CSS que quebra o layout do sistema. Solução: iframe com sandbox (mais seguro) ou wrapper com `all: revert` — decidir na implementação
  - Batch endpoint do Gmail API tem semantica diferente (multipart response) — se ficar complicado, cair pra chamadas sequenciais e otimizar depois
- **Decisões pendentes**:
  - Iframe vs div sanitizado pro corpo do email → começar com div (mais simples); se problemas de CSS aparecerem, migrar pra iframe sandbox
- **Assunções**:
  - Diego tem emails nas 3 categorias (senão validação manual fica limitada)
