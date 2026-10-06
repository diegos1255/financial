# WORK-35 — Ajustes: chave do chat, motivo do cancelamento e coluna Parcelas

## Metadados

- `spec_id`: WORK-35
- `titulo_tecnico`: Feature flag do chat agêntico; motivo obrigatório ao cancelar despesa (visível no filtro "Canceladas"); coluna Parcelas com texto por tipo
- `source_product_spec`: Conversa Diego ↔ Claude em 2026-10-05/06 ("aprovo tudo")
- `baseline_branch_or_commit`: `master @ 8ab0855` (após WORK-34)
- `target_branch`: `fix/work-35-ajustes`
- `escopo_sistema`: financial (backend) + financial-front + docker-compose/.env
- `última_atualização`: 2026-10-06

## Requisitos

### REQ-01 — Chave liga/desliga do chat (D-1: opção B)

- Nova variável **`FEATURES_CHAT_ENABLED`** (padrão `true`, mesmo padrão de `FEATURES_INVESTMENTS_ENABLED`)
- `application.yml`: `chat.enabled: ${FEATURES_CHAT_ENABLED:true}`; `ChatProperties.isEnabled()` = **chave ligada E** `GEMINI_API_KEY` preenchida
- Desligada: `/api/chat/status` → `enabled: false` (a bolinha ✨ some — o front já respeita isso) e os endpoints do chat retornam 503 (comportamento existente)
- Variável repassada no `docker-compose.yml` e `docker-compose.dist.yml`; documentada no `.env.example`
- No `.env` do Mac do Diego: `FEATURES_CHAT_ENABLED=false` (a `GEMINI_API_KEY` é mantida — religar = trocar para `true` e recriar o backend)

### REQ-02 — Motivo do cancelamento de despesa (D-2)

- **Obrigatório** e para **todos os tipos** (fixa, parcelada, variável) — mesmo botão ⊘
- Backend: `expenses.cancellation_reason VARCHAR(255) NULL` (nova coluna via `ddl-auto`); `POST /api/expenses/{id}/cancel` passa a receber `{ "reason": "..." }` (`@NotBlank`, máx. 255) → 400 se vazio; `ExpenseResponse.cancellationReason`
- Front: o modal de confirmação ganha campo **"Motivo"** (obrigatório; botão desabilitado sem texto)
- Coluna **"Motivo"** (texto + data do cancelamento) **só quando o filtro de status = "Canceladas"** (D-3)
- Filtro "Todos status": motivo no **tooltip** do selo "Cancelada"
- Canceladas antes desta mudança: *"Motivo não informado"*
- **D-5** (após teste): no filtro "Canceladas" a coluna **Ações** some (canceladas não têm ação possível — a coluna já ficava vazia)

### REQ-03 — Coluna Parcelas com texto por tipo (D-4)

| Tipo | Antes | Depois |
|---|---|---|
| Fixa | — | **Mensal** |
| Variável | — | **À vista** |
| Parcela | `x/y pagas` | sem mudança |

### REQ-05 — Cores da barra por porcentagem (D-6)

- Substitui as faixas fixas em R$ da WORK-30 (D-5: 5 mil / 10 mil) e da WORK-31 (D-3: 15 mil / 28 mil), que só serviam para os valores do Diego
- Regra única (`utils/progressTone.ts`), para Salários e Rescisão (telas e cards do dashboard): **recebido ≤ 33% do total → vermelho; ≤ 70% → laranja; > 70% → verde**
- Sem total informado: "Recebido" em cor neutra (e sem barra, como já era)

### ~~REQ-06 — Total do salário só manual (D-7)~~ — CANCELADO

- Diego pediu para desligar a sincronização NF → salário, mas voltou atrás antes do commit: a NF de setembro não sincronizou só porque foi lançada (02/10) **antes** da WORK-30 existir (04/10). A sincronização da WORK-30 (D-4) **continua valendo**
- Para a NF antiga entrar no salário: editar e salvar a NF (o salvamento dispara a sincronização)

### REQ-07 — NF preenche o salário do mês SEGUINTE (D-8)

- A NF tem a competência do **mês trabalhado** (ex.: setembro) e o dinheiro entra no **mês seguinte** (outubro) — mesma lógica dos impostos do dashboard (mês anterior)
- `SalaryService.syncExpectedFromInvoice` recebe a competência da NF e grava no salário de **competência + 1** (dezembro → janeiro do ano seguinte); selo "da NF" do salário procura a NF do **mês anterior**
- Textos: selo "**da NF de setembro**" no salário de outubro; aviso do modal de total cita o mês da NF; no PJ, card "NF do mês" diz "**Preenche o salário de outubro**"
- Ajusta a WORK-30 D-4 (que usava o mesmo mês)

### REQ-08 — Impostos PJ descontados do saldo (D-9)

- Como o salário agora vem do **bruto** da NF, os impostos dessa NF (DAS, INSS, Contabilidade) precisam sair: **Saldo = salário recebido − despesas − impostos PJ do mês anterior** (os mesmos do card "Impostos PJ — referente a {mês−1}")
- Cálculo no backend (`DashboardService.computeBalance`), então saldo, frase da faixa de boas-vindas e evolução mensal acompanham; `BalanceResponse.pjTaxes` e `MonthEvolutionResponse.pjTaxes` novos
- Card "Total de Despesas" continua **só despesas**; card Saldo ganha a linha "Salário − despesas − impostos PJ"
- Gráfico "Entradas e saídas": barra vermelha = **despesas + impostos** (D-10, Diego aceitou); ao clicar, os impostos aparecem na lista como "DAS — ref. setembro" com selo "Imposto" (`MonthExpenseItemResponse.kind = PJ_TAX`)

### REQ-04 — Códigos de erro corretos (encontrado nos testes)

- `ApiErrorHandler` não tratava `ResponseStatusException` nem `HttpMessageNotReadableException` → ambos viravam **500**
- Agora: chat desligado → **503** `SERVICE_UNAVAILABLE` ("Chat desabilitado"); corpo ausente/JSON inválido → **400** `INVALID_PAYLOAD`
- Mensagem do 503 do chat deixa de citar `GEMINI_API_KEY` (pode estar desligado pela chave)

## Testes

- Unit: `ExpenseServiceTest` — cancelar grava motivo e data; cancelar já cancelada → exceção
- Unit: `ChatProperties` — desligado quando a chave está `false` mesmo com API key
- Manual: bolinha do chat some com `false` e volta com `true`; cancelar despesa exige motivo; filtro "Canceladas" mostra a coluna; "Todos status" mostra tooltip; coluna Parcelas com Mensal/À vista

## Rollback

Reverter o merge. A coluna `cancellation_reason` fica no banco (inofensiva). Chat: `FEATURES_CHAT_ENABLED=true`.
