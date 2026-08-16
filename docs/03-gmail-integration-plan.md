# Plano-mãe: Integração Gmail

Documento de referência para a integração do Gmail no sistema. Segue o padrão de `docs/02-development-plan.md` (plano-mãe do sistema financeiro). Cada fase abaixo vira uma spec técnica própria em `docs/specs/work-NN-gmail-*.md` quando chegar a hora dela — segue o mesmo fluxo SDD: **plano-mãe aprovado → spec da fase → aprovação da spec → código → aprovação → próxima fase**.

## Contexto e motivação

Diego decidiu transformar o sistema `financial` em **plataforma pessoal** com múltiplos módulos, e o primeiro a ser adicionado é um cliente Gmail integrado. Objetivo prático:

- Ler emails organizados por categorias (Principal / Promoções / Atualizações)
- Enviar emails
- Criar labels custom e mover emails entre elas
- Ver notificações em tempo real (badge com contador + toast quando chegar email novo)

O sistema passa a ter o Gmail como submenu; UI é construída no `financial-front` (sem iframe do gmail.com), consumindo endpoints do backend, que fala com a Gmail API.

## Decisões arquiteturais firmadas

- **Gmail API oficial + OAuth 2.0** (não IMAP)
- **UI construída no front** (não iframe, não redirect pro gmail.com)
- **Menu vem do banco** via `data.sql` (mantém padrão dos outros itens de menu)
- **Refresh token criptografado no DB** com AES-GCM; chave em env var `GMAIL_TOKEN_ENCRYPTION_KEY`
- **HTML sanitizado no frontend** com DOMPurify antes de renderizar corpo de email
- **Polling do backend** pra badge/toast (não Push via Cloud Pub/Sub por enquanto — simplifica setup, custo em latência aceitável)
- **Test mode** do Google Cloud (só Diego autorizado). Refresh token expira em 7 dias — UI trata isso avisando pra reconectar

## Fases

Total estimado: **~67-115 horas** distribuídas em 8 WORKs (17 já concluída, próximas: 18 a 25).

### WORK-18 — Fase 0: Setup OAuth + tokens seguros

- Google Cloud Console: criar projeto, habilitar Gmail API, configurar OAuth consent screen (modo test), gerar Client ID + Client Secret (parte manual, Diego faz seguindo doc a gente escreve)
- Backend:
  - Nova entidade `GmailCredential` (user_id UNIQUE, refresh_token criptografado, access_token, expires_at, scopes, email_address, created_date, updated_date)
  - Service `GmailAuthService` que faz refresh do access_token quando necessário
  - Utilitário `TokenCipher` (AES-GCM) para criptografar/descriptografar refresh_token no DB
  - Endpoints:
    - `GET /api/gmail/status` — está conectado? qual email?
    - `GET /api/gmail/auth-url` — gera URL de autorização Google
    - `GET /api/gmail/callback` — recebe `code`, troca por tokens, salva
    - `DELETE /api/gmail/disconnect` — revoga token, apaga do DB
  - `application.yml`: `gmail.client-id`, `gmail.client-secret`, `gmail.redirect-uri`, `gmail.token-encryption-key`
  - `.env.example` atualizado; `docker-compose.yml` passa as vars
- Frontend:
  - Novo item de menu **"Email"** no `data.sql` (`sort_order = 8`, icon `mail`)
  - Página `/email` mostrando estado da conexão. Se não conectado: botão "Conectar Gmail" que redireciona pra URL de autorização; se conectado: mostra email conectado + botão "Desconectar"
  - Ainda sem inbox — só o gate de conexão
- **Estimativa: 6-10h**
- **Como validar:** clicar em "Conectar Gmail", autorizar no Google, voltar pro sistema e ver "Conectado como diego@gmail.com"

### WORK-19 — Fase 1: Inbox básico (leitura)

- Backend:
  - Endpoints:
    - `GET /api/gmail/threads?category=PRIMARY|PROMOTIONS|UPDATES&pageToken=xxx` — lista threads da categoria (paginação nativa do Gmail via `pageToken`)
    - `GET /api/gmail/threads/{id}` — retorna thread completa com mensagens (subject, from, to, date, body HTML, body text)
    - `POST /api/gmail/messages/{id}/read` — marca como lido (remove label `UNREAD`)
  - Service `GmailClient` que encapsula chamadas à Gmail API v1 (retry, refresh de token, error handling)
- Frontend:
  - Tela `/email` com 3 abas: **Principal / Promoções / Atualizações**
  - Cada aba: lista de threads (assunto, remetente, preview, data, badge "não lido")
  - Ao clicar numa thread: painel lateral (ou modal) mostra corpo (HTML sanitizado com DOMPurify)
  - Ao abrir uma thread não-lida, backend marca como lido automaticamente
  - Paginação "Carregar mais" na lista
- **Estimativa: 15-25h**
- **Como validar:** navegar pelas abas, abrir emails, ver conteúdo, marca como lido some o badge

### WORK-20 — Fase 2: Notificações (badge no menu + toast)

- Backend:
  - Endpoint `GET /api/gmail/unread-summary` — retorna `{ totalUnread, latestUnreadFrom, latestUnreadSubject, latestUnreadId }`. Cached 30s pra não estourar quota
- Frontend:
  - Hook `useGmailNotifications` que:
    - Chama `/api/gmail/unread-summary` a cada 30s (só quando user logado e Gmail conectado)
    - Compara `totalUnread` com o valor anterior
    - Se aumentou: dispara `toast.success("Novo email de: {latestUnreadFrom}")`
    - Retorna `totalUnread` pra outros componentes
  - `Sidebar`: mostra badge com número ao lado do item "Email". Se `unread > 99` mostra "99+". Estilo: badge redondo vermelho no canto direito do item de menu
  - Toast usa o `react-hot-toast` que já é config global
- **Estimativa: 5-10h**
- **Como validar:** deixar sistema aberto, mandar um email teste pro Gmail conectado, badge incrementa em ~30s e toast aparece

### WORK-21 — Fase 3: Ações (arquivar, mover pra lixeira, marcar não-lido)

- Backend:
  - `POST /api/gmail/messages/{id}/archive` — remove label `INBOX`
  - `POST /api/gmail/messages/{id}/trash` — move pra lixeira
  - `POST /api/gmail/messages/{id}/unread` — adiciona label `UNREAD`
  - `POST /api/gmail/messages/bulk` — ação em lote (`{ action: 'archive'|'trash'|'read'|'unread', ids: [...] }`)
- Frontend:
  - Botões nos threads/mensagens (arquivar, lixeira, marcar não-lido)
  - Checkbox de seleção múltipla + toolbar com ações em massa
- **Estimativa: 8-12h**
- **Como validar:** selecionar 3 emails, clicar "Arquivar", sumem da inbox. Ver na aba "Todos" (adicionar depois?) ou no Gmail confirmando

### WORK-22 — Fase 4: Labels customizadas

- Backend:
  - `GET /api/gmail/labels` — lista labels (custom + sistema)
  - `POST /api/gmail/labels` — cria label com nome
  - `PATCH /api/gmail/labels/{id}` — renomear
  - `DELETE /api/gmail/labels/{id}` — apagar
  - `POST /api/gmail/messages/{id}/labels` — adicionar/remover labels (`{ add: [...], remove: [...] }`)
- Frontend:
  - Sidebar do módulo Email mostra labels custom além das 3 categorias
  - Modal simples pra criar/renomear/deletar label
  - Botão "Mover pra label" no email → dropdown com todas labels
- **Estimativa: 5-8h**
- **Como validar:** criar label "Impostos", mover emails de contabilidade pra ela, ver a lista de emails da label

### WORK-23 — Fase 5: Enviar emails

- Backend:
  - `POST /api/gmail/messages/send` — payload `{ to, cc?, bcc?, subject, body }` — envia via Gmail API (`messages.send`)
  - Não trata rascunhos nesta fase
- Frontend:
  - Botão "Novo email" no header do módulo Email
  - Modal composer: campos To (com validação de formato), CC, BCC (colapsáveis), Subject, Body (textarea simples — sem editor rich)
  - Botões: Enviar / Cancelar / Descartar
  - Feedback via toast
- **Estimativa: 15-25h**
- **Como validar:** enviar email pra ti mesmo, chega na inbox em segundos

### WORK-24 — Fase 6: Busca

- Backend:
  - `GET /api/gmail/search?q=xxx&pageToken=xxx` — passa a query direto pra Gmail API (que suporta `from:`, `subject:`, `has:attachment`, `after:2026/07/01`, etc.)
- Frontend:
  - Barra de busca no topo do módulo Email
  - Resultados vêm numa aba "Busca" temporária
  - Sugestão de operadores em placeholder (ex: `from:receita.gov.br`)
- **Estimativa: 5-10h**
- **Como validar:** buscar `from:contabilidade`, listar só emails dela

### WORK-25 — Fase 7: Anexos (download + upload)

- Backend:
  - `GET /api/gmail/messages/{messageId}/attachments/{attachmentId}` — stream do anexo (download autenticado, similar ao endpoint de download do PJ)
  - `POST /api/gmail/messages/send` (upgrade da Fase 5): aceita multipart com anexos
- Frontend:
  - Lista de anexos na leitura da mensagem, cada um clicável → download stream
  - Preview inline pra imagens (JPG/PNG) e PDFs (via `<embed>` ou react-pdf)
  - No composer: botão "Anexar arquivo" (input file múltiplo)
  - Validação client-side: tamanho máximo 25MB por email (limite do Gmail)
- **Estimativa: 8-15h**
- **Como validar:** receber email com PDF anexo, baixar do sistema, arquivo idêntico. Enviar email com anexo, chegar no destino com o arquivo.

## Riscos e considerações

### Token e OAuth
- **Test mode expira em 7 dias**: refresh token perde validade. UI da Fase 0 já mostra "conectar novamente" quando o refresh falha. Alternativa futura: submeter app pra verificação da Google (semanas de processo).
- **Escopos sensíveis**: pedimos `gmail.modify` + `gmail.send` — são "restricted scopes". Em test mode não precisa homologação, mas se um dia expandir uso, tem processo.

### Segurança
- Refresh token = senha efetiva do Gmail. Guardar criptografado (AES-GCM com chave separada em env var).
- HTML de emails **DEVE** ser sanitizado com DOMPurify antes de renderizar. Emails maliciosos podem tentar XSS.
- Bucket de anexos (se for cachear) precisa ser privado, similar ao `financial-pj-files`.

### Rate limits
- Gmail API: 250 quota units/second/user, ~1 bilhão/day. Cada operação custa entre 1-100 quota units.
- Polling de 30s do badge = ~5 quota/min = OK.
- Sync inicial de threads pode consumir muito. Paginar com `pageSize = 20` e usar `pageToken`.

### Performance da UI
- Não sincronizar tudo localmente (evitar complexidade de sync bidirecional).
- Cache em memória no front pra scroll rápido durante uma sessão; refresh manual botão "Atualizar".

### Verificação futura da Google
- Se algum dia quiser passar isso pra outra pessoa usar (como fez com o financial), vai precisar verificar o app na Google. Não é bloqueio agora.

## Ordem cronológica esperada

WORK-18 → WORK-19 → WORK-20 → WORK-21 → WORK-22 → WORK-23 → WORK-24 → WORK-25

Cada fase é auto-contida e entrega valor. Diego pode:
- Pausar em qualquer fase e o sistema continua funcional
- Reordenar (ex: pular Fase 6 e voltar depois) se descobrir que Search não é prioridade dele

## Ligações com resto do sistema

- **Menu**: item "Email" adicionado via `data.sql`, com badge dinâmico (Fase 2). Sort order = 8 (após "PJ" = 7)
- **Dashboard**: sem impacto na Fase 0-7. Se futuramente quiser card "Emails não lidos" no dashboard, é iteração separada
- **Autenticação**: reusa o JWT/CSRF/AuthContext existente. Gmail é módulo adicional, não substitui login do sistema
- **MinIO**: não usa nesta fase (anexos vão direto do Gmail via stream); se quiser cachear anexos futuramente, usa bucket privado similar ao PJ

## Coisas fora do escopo (pra deixar registrado)

- Editor rich text no composer (só texto simples)
- Rascunhos (drafts)
- Push notifications via Cloud Pub/Sub (polling é suficiente pro caso)
- Sincronização offline
- Múltiplas contas Gmail (só 1 por user do sistema)
- Emails de outras contas (Outlook, Yahoo, etc.)
- Filtros/regras automáticas de organização
- Sugestão de resposta (Smart Reply)
- Snooze de emails

Se Diego pedir alguma dessas depois, entram como iterações futuras.

## Nomenclatura do sistema

Diego mencionou que ao ganhar módulos além de finanças, faz sentido renomear o sistema. Sugestões (não urgente, mas anotar):
- `hub`, `home`, `personal-hq`, `dhq` (Diego HQ), `orbit`
- Renomear vira uma WORK futura (rename + atualizar README/repos/docker images do GHCR/etc.)

Enquanto isso, dentro do repo `financial`, o módulo Gmail vive em:
- Backend: pacote `com.financial.gmail.*` (isolado do resto)
- Frontend: `src/pages/gmail/*` e `src/services/gmailService.ts`
