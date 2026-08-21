# WORK-20 — Gmail notificações (badge + toast)

## Metadados

- `spec_id`: WORK-20
- `titulo_tecnico`: Integração Gmail — Fase 2: contagem de não-lidos no menu + toast de novo email
- `source_product_spec`: `docs/03-gmail-integration-plan.md`
- `source_product_spec_version`: 1
- `baseline_branch_or_commit`: `master` após merge da WORK-19
- `target_branch`: `work-20-gmail-notifications`
- `escopo_sistema`: financial (endpoint dedicado) + financial-front (hook + sidebar)
- `última_atualização`: 2026-08-08

## 1. Objective do documento

- Mostrar contador de emails não-lidos ao lado do item "Email" no sidebar (badge redondo, número); `> 99` exibe "99+"
- Toast na tela quando chegar novo email: **"Novo email de: {remetente}"**
- Ambos derivam de um único mecanismo: **polling do backend a cada 30s**
- **Não cobre**: push notification via Cloud Pub/Sub; browser notifications API; áudio

## 2. System overview

- **Estado atual (pós WORK-19)**: sistema lista emails, mas não sabe automaticamente quando chegou novo
- **Estado alvo**:
  - Endpoint `/api/gmail/unread-summary` retorna `{ totalUnread, latestUnreadId, latestUnreadFrom, latestUnreadSubject }`
  - Cache in-memory no backend (30s TTL) pra não estourar quota
  - Hook `useGmailNotifications` no frontend faz polling a cada 30s
  - Sidebar renderiza badge com `totalUnread`
  - Quando `totalUnread` aumenta entre polls, dispara toast com dados do `latestUnread`
- **Delta técnico**:
  - 1 endpoint novo no backend
  - 1 service method (`getUnreadSummary`) com cache
  - 1 hook no frontend
  - Sidebar acomoda badge dinâmico (só no item "Email")
- **Fora de escopo**: notificações desktop, som, contadores em outros locais do sistema

## 3. Architecture design

- **Fonte da verdade**: Gmail API `messages.list` com query `is:unread in:inbox` (só inbox, ignora spam/trash)
- **Cache no backend**: `Cache<UUID, UnreadSummaryResponse>` (Caffeine) com TTL 30s + max size 100
  - Chave: `userId`
  - Reduz calls à Gmail API: com 30s TTL e polling do front também de 30s, worst case = 1 chamada/min por user
- **Comparação de estado no frontend**: hook guarda `previousTotalUnread`; se `current > previous`, dispara toast com `latestUnreadFrom`
  - Edge case: primeiro carregamento (previous é null) → **não** dispara toast (evita "spam" ao abrir sistema)
- **Trade-offs**:
  - **Polling 30s** vs push via Pub/Sub → escolhido polling; latência 30s aceitável, sem infra extra (Pub/Sub exige webhook público)
  - **Cache 30s** vs sem cache → escolhido cachear; economiza quota. Perde tempo real fino mas 30s de latência já era o worst case do polling mesmo
  - **Toast só do latest email** vs listar todos os novos → escolhido só o latest; se mais de 1 email chegou entre polls, mostra só do último. Simplifica UX

## 4. Data design

- **Nenhuma tabela nova**
- **DTO**:
  ```java
  record UnreadSummaryResponse(
    int totalUnread,
    String latestUnreadId,       // null se totalUnread == 0
    String latestUnreadFrom,     // null se totalUnread == 0
    String latestUnreadSubject   // null se totalUnread == 0
  ) {}
  ```

## 5. Interface design

- **API REST**:

  | Método | Path | Descrição |
  |---|---|---|
  | `GET` | `/api/gmail/unread-summary` | Retorna `UnreadSummaryResponse` |

- **Cache header**: `Cache-Control: private, max-age=30` (opcional, deixa browser cachear também)

- **Errors**:
  - `GMAIL_NOT_CONNECTED` (404) → front interpreta como "não mostra badge nem toast"
  - `GMAIL_REAUTH_REQUIRED` (401) → front pausa polling, mostra badge com ícone de alerta

## 6. Component design

### `CMP-01` GmailNotificationService
- Path: `com.financial.gmail.service.GmailNotificationService`
- Método principal: `UnreadSummaryResponse getUnreadSummary(UUID userId)`
- Fluxo:
  1. Consulta cache → hit? retorna
  2. Miss → chama `gmailApiClient.listMessages(query="is:unread in:inbox", format=metadata, pageSize=1, includeHeaders=[From, Subject])`
  3. Também chama outra query só pra count total: `messages.list` sem pageSize retorna `resultSizeEstimate` — usa isso
  4. Monta DTO, popula cache, retorna
- Dep: `GmailApiClient` (da WORK-19)

### `CMP-02` GmailNotificationController
- Path: `com.financial.gmail.controller.GmailNotificationController`
- Endpoint `GET /api/gmail/unread-summary`
- Retorna 404 sem body se `GmailCredentialRepository.findByUserId` retornar vazio

### `CMP-03` CacheConfig
- Path: `com.financial.config.CacheConfig` (novo ou reusar existente do market prices)
- Adicionar cache Caffeine `gmail-unread-summary` com TTL 30s, size 100
- Usa `@Cacheable("gmail-unread-summary")` na method do service

### `CMP-04` useGmailNotifications hook
- Path: `src/hooks/useGmailNotifications.ts`
- Retorna: `{ totalUnread, isConnected, needsReauth }`
- Comportamento:
  ```ts
  useEffect(() => {
    if (!user) return; // só polla quando logado
    let prev: number | null = null;
    let firstTick = true;

    const tick = async () => {
      try {
        const summary = await gmailService.getUnreadSummary();
        if (summary === null) {
          setIsConnected(false);
          return;
        }
        setIsConnected(true);
        setTotalUnread(summary.totalUnread);

        if (!firstTick && prev !== null && summary.totalUnread > prev && summary.latestUnreadFrom) {
          toast.success(`Novo email de: ${summary.latestUnreadFrom}`, {
            duration: 5000,
            icon: '📧',
          });
        }
        prev = summary.totalUnread;
        firstTick = false;
      } catch (e) {
        if (e.status === 401 && e.code === 'GMAIL_REAUTH_REQUIRED') {
          setNeedsReauth(true);
        }
      }
    };

    tick(); // fetch inicial
    const interval = setInterval(tick, 30_000);
    return () => clearInterval(interval);
  }, [user]);
  ```
- Instalado no `ProtectedLayout` (roda enquanto user tá logado)

### `CMP-05` Sidebar (modificação)
- Path: `src/components/layout/Sidebar.tsx`
- Adicionar prop opcional `badge?: number` em cada item
- Renderizar badge redondo à direita quando > 0
- Estilo: `bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center`
- `> 99` → mostra "99+"
- Como o menu vem do DB, mapa hardcoded: `MENU_BADGES = { '/email': totalUnreadFromHook }`
  - Sidebar consome o hook e injeta o badge no item cuja route bate

### `CMP-06` gmailService.ts (expandido)
- Novo método: `getUnreadSummary(): Promise<UnreadSummaryResponse | null>` (null quando 404)

## 7. UI and interaction design

- **Badge**:
  ```
  📧 Email    (3)
  ```
  A "(3)" é um chip vermelho circular colado à direita do texto do item.
- **Toast**: mesmo estilo dos toasts existentes (`react-hot-toast`), duração 5s, ícone envelope
- **Sem badge quando não conectado**: se `/api/gmail/status` retornar `connected: false`, hook nem tenta pollar → sidebar mostra item "Email" sem badge (normal)

## 8. Runtime and operations

- **Sem novas env vars**
- **Dep nova backend**: `com.github.ben-manes.caffeine:caffeine` (se ainda não estiver) — já pode estar por causa do market prices; verificar
- **Sem deps novas frontend**
- **Rollout**: build + up padrão

## 9. Security, privacy and compliance

- **Rate limit**: mesmo polling em test mode não deve estourar quota. 1 user × 2 chamadas/min = OK
- **CSP**: nenhuma mudança necessária
- **Info leak**: `latestUnreadFrom` pode ter dados sensíveis. Toast fica no browser do user; sem log server-side

## 10. Requirement mapping

### `REQ-20-01` Badge com contador
- Aceite: com 5 emails não lidos, sidebar mostra "Email (5)". Após ler todos, badge some
- Testes: manual

### `REQ-20-02` Toast em novo email
- Aceite: deixa sistema aberto por 1min, manda email teste, ~30s depois aparece toast "Novo email de: X"
- Testes: manual E2E

### `REQ-20-03` Cache 30s
- Aceite: 2 requisições consecutivas ao endpoint (dentro de 30s) fazem só 1 chamada real ao Gmail
- Testes: unit no `GmailNotificationService` (mock do client, verificar chamadas)

### `REQ-20-04` Sem toast no primeiro carregamento
- Aceite: abrir sistema com N emails não lidos NÃO dispara toast (só se aumentar depois)
- Testes: manual

## 11. Implementation plan input

### `WORK-20A` Backend
- Arquivos:
  - `com/financial/gmail/service/GmailNotificationService.java`
  - `com/financial/gmail/controller/GmailNotificationController.java`
  - `com/financial/gmail/dto/UnreadSummaryResponse.java`
  - `com/financial/config/CacheConfig.java` (adicionar novo cache)
- Validar: `curl` retorna summary correta

### `WORK-20B` Frontend
- Arquivos:
  - `src/hooks/useGmailNotifications.ts`
  - `src/components/layout/Sidebar.tsx` (badge)
  - `src/components/layout/ProtectedLayout.tsx` (chamar o hook)
  - `src/services/gmailService.ts` (novo método)
- Validar: sidebar mostra badge, toast dispara

## 12. Test plan

- **Unit**: `GmailNotificationService` (cache hit vs miss)
- **Manual (Diego)**:
  - [ ] Ver badge inicial com número real dos emails não lidos
  - [ ] Ler 1 email → badge decrementa em até 30s
  - [ ] Mandar email teste pra si mesmo → toast aparece em até 30s
  - [ ] Sistema aberto por 5min sem novos → toast NUNCA aparece (só quando aumenta)
  - [ ] Desconectar Gmail → badge some (não mostra 0 nem X)
  - [ ] Ficar 2h sem interagir → polling continua ativo (verificar console)

## 13. Open items

- **Riscos**:
  - Se Diego tem MUITOS emails não lidos (500+), Gmail API pode retornar `resultSizeEstimate` impreciso (docs falam de estimativa). Verificar em prod
  - Polling perde bateria em dispositivos móveis (não é caso do Diego agora, mas anotar)
- **Decisões pendentes**:
  - Intervalo de 30s configurável via env? Por enquanto hardcoded. Se ficar problemático, expor
- **Assunções**:
  - Diego mantém browser aberto no sistema por horas (senão polling é irrelevante)
