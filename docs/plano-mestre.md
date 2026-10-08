# Plano-mestre — Financial

> Roadmap e lista de WORKs. Cada WORK tem a pasta `docs/specs/WORK-XX-assunto/`. Atualizado ao abrir e ao finalizar cada WORK.

## Visão

Controle financeiro pessoal multiusuário (salários por competência, despesas fixas/parceladas/variáveis, investimentos com cotação, PJ, Gmail e chat RAG), construído como exercício de Spec Driven Development. As WORK-01 a WORK-36 foram feitas antes do plugin sdd-diego. As specs delas estão em `docs/specs/work-XX-*.md` (arquivo único), e o plano original está em `docs/02-development-plan.md`. A partir da WORK-37, cada WORK segue o processo do sdd-diego.

## WORKs

| WORK | Assunto | Tipo | Status | Concluída em | Merge |
|---|---|---|---|---|---|
| WORK-01 | Setup & Configuração inicial | feature | ✅ concluída |  |  |
| WORK-02 | Entidades JPA | feature | ✅ concluída |  |  |
| WORK-03 | Security (login + JWT + proteção total) | feature | ✅ concluída |  |  |
| WORK-04 | CRUDs simples (Category, BankAccount, Investment, Menu read-only) | feature | ✅ concluída |  |  |
| WORK-05 | Salário (CRUD com regra de competência) | feature | ✅ concluída |  |  |
| WORK-06 | Despesas + Installments (a mais complexa) | feature | ✅ concluída |  |  |
| WORK-07 | Dashboard (agregações) | feature | ✅ concluída |  |  |
| WORK-08 | Frontend: setup + autenticação + telas amigáveis 401 | feature | ✅ concluída |  |  |
| WORK-09 | Frontend: telas CRUD + dashboard | feature | ✅ concluída |  |  |
| WORK-09B | Tipo de Despesa Variável (VARIABLE) | feature | ✅ concluída |  |  |
| WORK-09C | Dashboard com VARIABLE + Visibilidade de INSTALLMENT no mês de compra | feature | ✅ concluída |  |  |
| WORK-09D | Separação de `purchase_date` e `first_due_date` em Despesas INSTALLMENT | feature | ✅ concluída |  |  |
| WORK-09E | Redesign do Gráfico de Despesas por Categoria (Donut + Animação) | feature | ✅ concluída |  |  |
| WORK-09F | Color Picker nas Categorias | feature | ✅ concluída |  |  |
| WORK-09G | Controle de Pagamento de Parcelas | feature | ✅ concluída |  |  |
| WORK-10 | Docker orquestrado (back + front + postgres) | feature | ✅ concluída |  |  |
| WORK-11 | Signup público + upload de foto + MinIO | feature | ✅ concluída |  |  |
| WORK-12 | Hardening (rate limiting + security headers + logs) | feature | ✅ concluída |  |  |
| WORK-13 | Extras de query (paginação, filtros, PATCH /active) | feature | ✅ concluída |  |  |
| WORK-14 | Security hardening extra (auth cookie em produção + XSS defenses) | feature | ✅ concluída |  |  |
| WORK-15 | Cotações de mercado com Redis cache + Brapi | feature | ✅ concluída |  |  |
| WORK-16 | Dashboard enrichments (portfólio + pizza interativa + UI polish) | feature | ✅ concluída |  |  |
| WORK-17 | Módulo PJ (Notas Fiscais e Encargos Fiscais) | feature | ✅ concluída |  |  |
| WORK-18 | Gmail OAuth setup | feature | ✅ concluída | 2026-08-21 | dc33771 |
| WORK-19 | Gmail inbox básico | feature | ✅ concluída | 2026-08-21 | dc33771 |
| WORK-20 | Gmail notificações (badge + toast) | feature | ✅ concluída | 2026-08-21 | dc33771 |
| WORK-21 | Gmail ações (arquivar, lixeira, marcar não-lido, bulk) | feature | ✅ concluída | 2026-08-21 | dc33771 |
| WORK-22 | Gmail labels customizadas | feature | ✅ concluída | 2026-08-21 | dc33771 |
| WORK-23 | Gmail enviar emails | feature | ✅ concluída | 2026-08-21 | dc33771 |
| WORK-24 | Gmail busca | feature | ✅ concluída | 2026-08-21 | dc33771 |
| WORK-25 | Gmail anexos | feature | ✅ concluída | 2026-08-21 | dc33771 |
| WORK-26 | RAG setup (pgvector + schema + config Gemini) | feature | ✅ concluída | 2026-08-28 | 319ed2e |
| WORK-27 | RAG ingestion (chunker + embeddings + endpoint reindex) | feature | ✅ concluída | 2026-08-28 | 319ed2e |
| WORK-28 | RAG query (retrieval + generation via Gemini Flash) | feature | ✅ concluída | 2026-08-28 | 319ed2e |
| WORK-29 | Chat widget frontend (bolinha bottom-right + drawer) | feature | ✅ concluída | 2026-08-28 | 319ed2e |
| WORK-30 | Salário com recebimentos parciais (total previsto + recebimentos datados) | feature | ✅ concluída | 2026-10-04 | 7f9e84f |
| WORK-31 | Rescisão (valor total + recebimentos, no estilo da tela de Salários) | feature | ✅ concluída | 2026-10-04 | 6e1fbf1 |
| WORK-32 | Dashboard mais informativo (KPIs ricos, cores semânticas, evolução mensal) | feature | ✅ concluída | 2026-10-05 | 7f84f87 |
| WORK-33 | Consistência visual das telas (padrão do dashboard em todo o sistema) | feature | ✅ concluída | 2026-10-05 | 500cfa3 |
| WORK-34 | Animações do dashboard | feature | ✅ concluída | 2026-10-05 | 8ab0855 |
| WORK-35 | Ajustes: chave do chat, motivo do cancelamento e coluna Parcelas | ajuste | ✅ concluída | 2026-10-06 | 1f3486c |
| WORK-36 | Histórico da carteira: aportes, importação da B3, proventos e evolução patrimonial | feature | ✅ concluída | 2026-10-06 | de36b32 |
| WORK-37 | Gmail unread-summary responde 200 (`connected:false`) em vez de 404 sem Gmail conectado | ajuste | 🟡 em andamento | | |

## Próximas WORKs (backlog)

Encontrados na WORK-37 e deixados fora do escopo. Cada uma recebe um número quando for aberta.

| Assunto | Tipo provável | Origem |
|---|---|---|
| Reauth do Gmail engolido no `getLabel`: o `GmailReauthRequiredException` é capturado em `GmailNotificationService.fetchInboxUnreadCount`, e o unread-summary devolve "conectado, 0 não lidos" por um ciclo, em vez do 401 `GMAIL_REAUTH_REQUIRED` | ajuste | revisor de correção, WORK-37 |
| Chamada dupla do `/api/gmail/unread-summary` na carga inicial (2 GETs com 68 ms de diferença) | ajuste | teste visual, WORK-37 |
| 401 do `/api/users/me` sai como erro no console da tela de login (checagem de sessão antes do login) | ajuste | teste visual, WORK-37 |
