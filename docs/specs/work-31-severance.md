# WORK-31 — Rescisão (valor total + recebimentos, no estilo da tela de Salários)

## Metadados

- `spec_id`: WORK-31
- `titulo_tecnico`: Novo menu "Rescisão": cabeçalho com valor total da rescisão + recebimentos datados, barra de progresso, confetes a cada lançamento e card de acompanhamento no dashboard
- `source_product_spec`: Conversa Diego ↔ Claude em 2026-10-04 (proposta "menu novo" aprovada com ajustes)
- `source_product_spec_version`: 1
- `baseline_branch_or_commit`: `master @ 7f9e84f` (após WORK-30)
- `target_branch`: `feature/work-31-severance` (a criar a partir da `master`)
- `escopo_sistema`: financial (backend Spring Boot) + financial-front (React)
- `última_atualização`: 2026-10-04

## 1. Objective do documento

- O que esta spec técnica precisa permitir que engenharia faça:
  - Novo menu **"Rescisão"** (`/severance`) com uma tela **igual em espírito à de Salários** (WORK-30): card de resumo (total / recebido / falta + barra de progresso) e tabela de recebimentos
  - Diego informa o **valor total** da rescisão e vai **lançando cada parcela recebida** (data, valor, conta, descrição); a porcentagem vai enchendo a cada lançamento
  - **Confetes** a cada recebimento registrado, igual Salários
  - **Card pequeno no dashboard**: "A receber" e "Total recebido"
- O que esta spec **não** cobre:
  - Geração automática das parcelas previstas, vencimentos, status "atrasada" (Diego lança tudo à mão — decisão D-2)
  - Mais de uma rescisão por usuário (D-1)
  - Importação da planilha (Diego lança as 2 parcelas já recebidas manualmente)
  - Entrar no KPI Salário ou no Saldo do dashboard (o dinheiro é guardado — D-4)
- Artefatos complementares: WORK-30 (`docs/specs/work-30-salary-payments.md`) — mesmo padrão de UI e de API

## 2. System overview

- **Estado atual resumido**: Salários (WORK-30) já tem o padrão cabeçalho + recebimentos com card, barra e confete. Não existe nada para rescisão; Diego controla numa planilha.
- **Estado alvo resumido**: entidades `Severance` (1 por usuário) e `SeverancePayment`; 5 endpoints em `/api/severance`; tela `/severance`; item de menu via `data.sql`; card no dashboard.
- **Delta técnico**: só adições (tabelas novas criadas pelo `ddl-auto=update`, sem `DROP`); dashboard ganha 1 card que reutiliza o `GET /api/severance`.
- **Escopo explícito**: REQ-01 a REQ-05 (seção 10)
- **Fora de escopo**: ver seção 1
- **Restrições obrigatórias**: `user_id` em todas as tabelas; isolamento por usuário; `NUMERIC(12,2)`; UUID; confirmação em cadastros; sem Flyway (`ddl-auto=update`)

## 3. Architecture design

- **Arquitetura alvo**: mesma estrutura da WORK-30 (Controller → Service → Repository + MapStruct; página + card + modais no front)

```
SeveranceController ──► SeveranceService ──► SeveranceRepository         severances (0..1 por user)
                                         └─► SeverancePaymentRepository  severance_payments (N)
DashboardPage ──► GET /api/severance (só leitura, para o card)
```

- **Trade-offs assumidos**:
  - **Recurso singular** (`/api/severance`, sem id na URL do cabeçalho): Diego tem uma rescisão só; a API fica tão simples quanto a de Salários por mês. Se um dia houver outra, vira uma spec nova (D-1).
  - **Cabeçalho criado sob demanda** (ao informar o total ou lançar o 1º recebimento), igual Salários.
  - **Sem acoplamento com Salários**: código paralelo, não genérico — as duas telas podem evoluir separadas (ex.: cores diferentes, D-3). A duplicação de componentes visuais é pequena e aceita.
  - **Hard delete** de recebimento, igual WORK-30.

## 4. Data design

- **`severances` (nova)**

| Coluna | Tipo | Regra |
|---|---|---|
| `id`, `created_date`, `updated_date` | | `BaseEntity` |
| `user_id` | UUID FK → `users` | NOT NULL, **UNIQUE** (1 rescisão por usuário) |
| `total_amount` | `NUMERIC(12,2)` | NULL = não informado; senão `> 0` |
| `description` | `VARCHAR(255)` | opcional (ex.: "Rescisão empresa X") |

- **`severance_payments` (nova)**

| Coluna | Tipo | Regra |
|---|---|---|
| `id`, `created_date`, `updated_date` | | `BaseEntity` |
| `severance_id` | UUID FK → `severances` | NOT NULL |
| `user_id` | UUID FK → `users` | NOT NULL |
| `bank_account_id` | UUID FK → `bank_accounts` | NOT NULL; conta do usuário |
| `payment_date` | `DATE` | NOT NULL; **não pode ser futura** |
| `amount` | `NUMERIC(12,2)` | NOT NULL; `> 0` |
| `description` | `VARCHAR(255)` | opcional (ex.: "Parcela 3/15") |

  - Índices: `idx_severance_payments_severance (severance_id)`
- **Regras de validação**: `payment_date <= hoje` → senão **422 `PAYMENT_DATE_IN_FUTURE`**; conta de outro usuário → 404; recebido acima do total **não bloqueia** (aviso no front, igual Salários)
- **Compatibilidade retroativa**: só adições; nenhuma tabela existente muda
- **Migração de dados**: nenhuma; as 2 parcelas já recebidas são lançadas pelo Diego na tela
- **Menu**: novo `INSERT ... WHERE NOT EXISTS` no `data.sql`: label `Rescisão`, rota `/severance`, ícone `handshake`, `sort_order 8`; `UPDATE menus SET sort_order = 9 WHERE label = 'Email' AND sort_order = 8` (idempotente) para o Email continuar por último

## 5. Interface design

| Método | Path | Body | Resposta | Comportamento |
|---|---|---|---|---|
| GET | `/api/severance` | — | 200 `SeveranceResponse` | Sempre 200; sem cabeçalho → `id: null`, `totalAmount: null`, `payments: []` |
| PUT | `/api/severance` | `SeveranceHeaderRequest` | 200 `SeveranceResponse` | Upsert do total + descrição |
| POST | `/api/severance/payments` | `SeverancePaymentRequest` | 201 `SeveranceResponse` | Cria recebimento (cria cabeçalho se não existir) |
| PUT | `/api/severance/payments/{id}` | `SeverancePaymentRequest` | 200 `SeveranceResponse` | Edita recebimento |
| DELETE | `/api/severance/payments/{id}` | — | 200 `SeveranceResponse` | Hard delete |

```jsonc
// SeveranceHeaderRequest
{ "totalAmount": 38640.00, "description": "Rescisão empresa X" }   // totalAmount pode ser null

// SeverancePaymentRequest
{ "paymentDate": "2026-09-30", "amount": 2576.12, "bankAccountId": "uuid", "description": "Parcela 2/15" }

// SeveranceResponse
{
  "id": "uuid | null",
  "totalAmount": 38640.00,       // null = não informado
  "receivedAmount": 5152.24,
  "remainingAmount": 33487.76,   // null se total null; negativo se passou do total
  "paymentsCount": 2,
  "description": "Rescisão empresa X",
  "payments": [ { "id": "uuid", "paymentDate": "2026-09-30", "amount": 2576.12,
                  "bankAccountId": "uuid", "bankAccountName": "Nubank", "description": "Parcela 2/15" } ]
}
```

- Ordenação dos recebimentos: `payment_date ASC, created_date ASC`
- Erros: 422 `PAYMENT_DATE_IN_FUTURE`; 404 `NOT_FOUND` (recebimento/conta de outro usuário); 400 bean validation
- Autenticação: JWT + `CurrentUser.id()` em todas as queries

## 6. Component design

### `CMP-01` Entidades e repositórios
- `model/Severance.java`, `model/SeverancePayment.java`
- `repository/SeveranceRepository` (`findByUserId`), `repository/SeverancePaymentRepository` (`findByIdAndUserId`, `findBySeveranceIdOrderByPaymentDateAscCreatedDateAsc`)

### `CMP-02` `SeveranceService`
- `get()`, `upsertHeader(req)`, `addPayment(req)`, `updatePayment(id, req)`, `deletePayment(id)` — todos devolvem `SeveranceResponse`
- Valida conta do usuário e data não futura (`PaymentDateInFutureException`, nova → 422)
- `receivedAmount` = soma; `remainingAmount` = total − recebido (null sem total); `paymentsCount`

### `CMP-03` DTOs, mapper, controller, exceção
- `dto/SeveranceHeaderRequest`, `SeverancePaymentRequest`, `SeverancePaymentResponse`, `SeveranceResponse`
- `mapper/SeveranceMapper` (payment → response, conta id + nome)
- `controller/SeveranceController` (5 endpoints)
- `exception/PaymentDateInFutureException` + handler no `ApiErrorHandler`

### `CMP-04` Menu
- `data.sql`: insert do menu + update do sort do Email (seção 4)
- `Sidebar.tsx`: `handshake: Handshake` no `ICON_MAP`
- `App.tsx`: rota `/severance`

### `CMP-05` Dashboard
- `DashboardPage.tsx`: card compacto **"Rescisão"** — "Total a receber: R$ X" (= **valor total da rescisão**) e "Recebido: R$ Y" (= recebido até agora); respeita o "olhinho" (`mask`) como os outros valores
- Só aparece se houver rescisão com total informado; **não entra** no Salário nem no Saldo
- **Posição (D-8)**: coluna da direita, **abaixo do Portfólio**, empilhados; Portfólio + Rescisão juntos têm a altura do gráfico de pizza (Portfólio estica, Rescisão tem altura natural). A linha dos 4 KPIs fica intacta. O card tem **mini barra** com as mesmas faixas de cor da tela (`pages/severance/severanceTone.ts`, compartilhado)

## 7. UI and interaction design

- **Tela nova** `/severance` (`pages/severance/SeverancePage.tsx`), mesma cara de Salários, **sem filtro de mês** (a rescisão atravessa vários meses):

```
Rescisão                                            [+ Registrar recebimento]
Rescisão empresa X
┌──────────────────────────────────────────────────────────────────┐
│ TOTAL DA RESCISÃO      RECEBIDO            FALTA                  │
│ R$ 38.640,00           R$ 5.152,24         R$ 33.487,76           │
│ ███░░░░░░░░░░░░░░░░░  13%  ·  2 recebimentos     [✏️ Editar total] │
└──────────────────────────────────────────────────────────────────┘
 DATA         VALOR          CONTA      DESCRIÇÃO         AÇÕES
 31/08/2026   R$ 2.576,12    Nubank     Parcela 1/15      ✏️ 🗑
 30/09/2026   R$ 2.576,12    Nubank     Parcela 2/15      ✏️ 🗑
```

- **Componentes novos**: `SeveranceSummaryCard.tsx`, `SeverancePaymentFormModal.tsx`, `SeveranceTotalModal.tsx`, `services/severanceService.ts`, `types/severance.ts`
- **Cores (D-3)**: "Total" preto; "Falta" índigo (`accent`); "Excedente" âmbar — iguais a Salários. **Barra e "Recebido" por faixas fixas do valor recebido** (mesma ideia de Salários, outros limites): **até R$ 15.000,00 vermelho**, **até R$ 28.000,00 laranja**, **acima de R$ 28.000,00 verde**. A barra enche pela porcentagem do total; sem total informado não há barra.
- **Modal de recebimento**: data (`max` = hoje; default = hoje), valor (`CurrencyInput`; default = valor do último recebimento, já que a parcela é fixa), conta (default = última usada, `localStorage` próprio), descrição; **passo de confirmação**; aviso âmbar se passar do total
- **Confetes (REQ-03)**: `celebrateSuccess(4000)` a **cada recebimento registrado** (não na edição), igual Salários
- **Estados**: loading (skeleton), vazio ("Nenhum recebimento ainda." + "Informar total"), erro (toast), sucesso (toast)
- **Responsividade/acessibilidade**: mesmos padrões de Salários

## 8. Runtime and operations

- Config/flags: nenhuma
- Rollout: `docker compose up -d --build` (tabelas criadas pelo Hibernate; menu pelo `data.sql`). Depois do merge, reindex do chat RAG (opcional) para o chat conhecer a tela.
- Rollback: imagem anterior; tabelas novas ficam órfãs e inofensivas; remover o menu com `DELETE FROM menus WHERE label = 'Rescisão'`

## 9. Security, privacy and compliance

- Valores de renda (mesma natureza de Salários); isolamento por `CurrentUser.id()`; nada novo de segurança

## 10. Requirement mapping

### `REQ-01` Menu e tela "Rescisão"
- `source_requirement`: "o menu pode se chamar Recisao... uma tela parecida com a de salários"
- Critério de aceite: item no menu abre `/severance` com card + tabela

### `REQ-02` Total + lançamentos com porcentagem
- `source_requirement`: "coloco o valor total a receber e vou lançando... a cada lançamento vai preenchendo a porcentagem"
- Critério de aceite: informar total; cada recebimento atualiza recebido, falta e barra

### `REQ-03` Confetes
- `source_requirement`: "vai ter confetes igual o de salários, a cada lançamento"
- Critério de aceite: confete ao registrar recebimento

### `REQ-04` Card no dashboard
- `source_requirement`: "card pequeno... Total a receber = valor total da rescisão, recebido = valor recebido até agora"
- Critério de aceite: card mostra "Total a receber" (total) e "Recebido" (soma); some se não houver total; não altera Salário/Saldo

### `REQ-05` Valores lançados pelo Diego
- `source_requirement`: "o valor da parcela eu mesmo preencho... e o valor total eu coloco também"
- Critério de aceite: nada calculado/gerado automaticamente; modal sugere o último valor só por conveniência

## 11. Implementation plan input

| Sub-WORK | Objetivo | Como validar |
|---|---|---|
| WORK-31.1 | Entidades + repositórios | backend sobe e cria as 2 tabelas |
| WORK-31.2 | Service + exceção + handler + `SeveranceServiceTest` | testes passando |
| WORK-31.3 | DTOs + mapper + controller | curl dos 5 endpoints |
| WORK-31.4 | Menu (`data.sql`, ícone, rota) | item aparece entre PJ e Email |
| WORK-31.5 | Front: tipos, service, página, card, modais, confete | `tsc` + lint limpos; teste manual |
| WORK-31.6 | Card no dashboard | card com valores corretos e máscara |
| WORK-31.7 | Postman | requests da pasta "Rescisão" |

- Pré-requisitos: nenhum (master já tem WORK-30 e o setup do Mac)
- Pode ser paralelo: `não`

## 12. Test plan

- **Unitários** (`SeveranceServiceTest`, Mockito): cálculo recebido/falta/contagem; falta null sem total; falta negativa acima do total; data futura → exceção; data de hoje → ok; 1º recebimento cria cabeçalho; conta de outro usuário → 404
- **Manuais** (Docker, `http://localhost`):
  1. Menu "Rescisão" aparece e abre a tela vazia
  2. Informar total → card mostra total e falta
  3. Lançar as 2 parcelas já recebidas (datas passadas) → barra/cores/porcentagem e **confete** a cada uma
  4. Tentar data futura → calendário não permite; via API → 422
  5. Editar e remover recebimento → card atualiza
  6. Dashboard: card "Rescisão" com "A receber" e "Total recebido"; Salário e Saldo **inalterados**; olhinho mascara os valores
- **Regressões**: Salários (WORK-30), dashboard, ordem do menu

## 13. Open items

- **Decisões tomadas** (Diego, 2026-10-04):
  - **D-1**: uma rescisão por usuário
  - **D-2**: sem parcelas geradas/vencimentos; Diego lança total e recebimentos à mão
  - **D-4**: fora do KPI Salário e do Saldo; card próprio no dashboard ("se ficar feio a gente ajusta depois")
  - **D-3**: barra e "Recebido" por faixas fixas: até R$ 15 mil vermelho, até R$ 28 mil laranja, acima verde
  - **D-5**: label do menu com acento: **Rescisão**
  - **D-6**: card do dashboard = "Total a receber" (total da rescisão) + "Recebido" (soma até agora)
  - **D-7**: os valores desta spec são exemplos; nada é pré-lançado — Diego lança total e recebimentos
  - **D-8** (após teste na tela): card da rescisão no dashboard sai da linha própria e vai para baixo do Portfólio, com mini barra
- **Riscos**: nenhum relevante (só adições)

## Critério de "pronto"

```
[ ] Tabelas severances e severance_payments criadas; menu "Rescisão" entre PJ e Email
[ ] 5 endpoints; 422 para data futura
[ ] Tela com card, barra colorida, tabela e confete a cada recebimento
[ ] Card no dashboard sem afetar Salário/Saldo
[ ] SeveranceServiceTest passando; tsc e lint limpos nos arquivos novos
[ ] Testes manuais 1–6 ok
[ ] Diego aprova → commit na feature/work-31-severance → merge na master
```
