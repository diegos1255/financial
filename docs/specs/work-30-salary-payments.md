# WORK-30 — Salário com recebimentos parciais (total previsto + recebimentos datados)

## Metadados

- `spec_id`: WORK-30
- `titulo_tecnico`: Salário por competência passa a ter **total previsto** (cabeçalho) + **N recebimentos datados**; dashboard soma apenas o recebido; total previsto preenchido automaticamente pela NF do módulo PJ
- `source_product_spec`: Conversa Diego ↔ Claude em 2026-10-04 (plano aprovado com as 4 sugestões)
- `source_product_spec_version`: 1
- `baseline_branch_or_commit`: `master @ 6a7df6b` (ver pré-requisito P-1 sobre `fix/setup-macos`)
- `target_branch`: `feature/work-30-salary-payments` (a criar a partir da `master`)
- `escopo_sistema`: financial (backend Spring Boot) + financial-front (React)
- `última_atualização`: 2026-10-04

## 1. Objective do documento

- O que esta spec técnica precisa permitir que engenharia faça:
  - Transformar o `Salary` em **cabeçalho da competência** (mês/ano + total previsto opcional)
  - Criar a entidade `SalaryPayment` para registrar **cada recebimento** (data, valor, conta, descrição)
  - Reescrever a tela `/salaries` para mostrar o **resumo do mês** (total / recebido / falta + barra de progresso) e a **tabela de recebimentos**
  - Fazer o KPI **Salário** do dashboard somar apenas os **recebimentos** do mês
  - Preencher/atualizar o total previsto automaticamente quando a **NF (INVOICE)** do mês for lançada no módulo PJ
- O que esta spec **não** cobre:
  - Rescisão parcelada (Diego vai tratar depois, em outra spec)
  - Migração dos dados da base antiga do Windows (a base do Mac é nova e não tem salários)
  - Recebimentos fora do mês da competência (decisão D-1)
  - Mudanças visuais no dashboard (só muda a origem do número do KPI Salário)
  - Alertas/notificações de recebimento
- Artefatos complementares: nenhum (spec autocontida)

## 2. System overview

- **Estado atual resumido**:
  - `Salary` = 1 registro por (user, ano, mês) com `bank_account_id`, `amount`, `description` (WORK-05)
  - Tela `/salaries` lista **todos** os salários (sem filtro), com modal Novo/Editar (conta, mês, ano, valor, descrição) com passo de confirmação
  - Dashboard: `DashboardRepository.sumSalary` soma `salaries.amount` da competência
  - Módulo PJ (WORK-17): `PjEntry` com tipo `INVOICE` = NF do mês (1 por mês, `amount > 0`)
- **Estado alvo resumido**:
  - `Salary` = cabeçalho da competência: `expected_amount` (total previsto, **opcional**) + `description`
  - `SalaryPayment` = recebimentos da competência (N por mês), cada um com data, valor, conta e descrição
  - Tela `/salaries` com filtro mês/ano, card de resumo e tabela de recebimentos
  - Dashboard soma `salary_payments.amount` da competência
  - Criar/editar/excluir a NF no PJ sincroniza o `expected_amount` da competência
- **Delta técnico**:
  - Backend: entidade nova + repositório + service + endpoints novos; `Salary` perde `bank_account_id` e `amount` vira `expected_amount` nullable; endpoints antigos de CRUD de salário são substituídos; `PjEntryService` passa a chamar a sincronização; `sumSalary` muda a query
  - Frontend: `SalariesPage` reescrita, 2 modais novos, `SalaryFormModal` removido, tipos/service atualizados
- **Escopo explícito**: REQ-01 a REQ-06 (seção 10)
- **Fora de escopo**: ver seção 1
- **Restrições obrigatórias**:
  - Sem Flyway/Liquibase (`ddl-auto=update`) — mudança de schema de `salaries` exige o passo manual da seção 4
  - `user_id` em todas as tabelas de domínio; isolamento por usuário em todas as queries
  - Valores `NUMERIC(12,2)`, PK UUID, `TIMESTAMP WITH TIME ZONE` (herdados de `BaseEntity`)
  - Confirmação em ações de cadastro (padrão de UX do projeto)

## 3. Architecture design

- **Arquitetura atual relevante**: Controller → Service → Repository (Spring Data JPA) + MapStruct; front com páginas em `pages/<feature>`, services em `services/`, componentes `ui/` reutilizáveis (`Table`, `Modal`, `Select`, `CurrencyInput`, `ConfirmModal`, `KpiCard`)
- **Arquitetura alvo**: mesma estrutura; `SalaryService` concentra cabeçalho **e** recebimentos (um único agregado "salário do mês"), exposto por `SalaryController`
- **Principais componentes e relações**:

```
PjEntryService ──(INVOICE criada/alterada/excluída)──► SalaryService.syncExpectedFromInvoice(...)
                                                            │
SalaryController ──► SalaryService ──► SalaryRepository ────┤  salaries (1 por user/ano/mês)
                                   └─► SalaryPaymentRepository  salary_payments (N por salary)
DashboardService ──► DashboardRepository.sumSalary ──► SUM(salary_payments.amount) da competência
```

- **Trade-offs assumidos**:
  - **Endpoints orientados à competência** (`/api/salaries/{year}/{month}`) em vez de CRUD por id do cabeçalho: a tela sempre trabalha com "o mês selecionado", e o cabeçalho pode nem existir ainda (é criado sob demanda). Simplifica o front.
  - **Cabeçalho criado sob demanda**: lançar o 1º recebimento, informar o total ou lançar a NF cria o cabeçalho se não existir. O usuário nunca precisa "criar salário" antes.
  - **NF é a fonte do total**: editar a NF sobrescreve o total, mesmo que tenha sido editado à mão antes (D-4).
  - **Hard delete** em recebimentos, mantendo a exceção já aceita para `Salary` na WORK-05 (O-15): recebimento lançado errado é apagado e relançado.

## 4. Data design

- **Entidades impactadas**: `Salary` (alterada), `SalaryPayment` (nova)

- **`salaries` (alterada)**

| Coluna | Antes | Depois |
|---|---|---|
| `bank_account_id` | `UUID NOT NULL` FK | **removida** (a conta vai para cada recebimento) |
| `amount` | `NUMERIC(12,2) NOT NULL` | **removida** |
| `expected_amount` | — | `NUMERIC(12,2) NULL` — total previsto; `NULL` = não informado |
| `description` | `VARCHAR(255)` | mantida |
| `reference_year`, `reference_month`, `user_id` | | mantidos; `UNIQUE(user_id, reference_year, reference_month)` mantido |

  - Check: `reference_month BETWEEN 1 AND 12 AND reference_year >= 2000 AND (expected_amount IS NULL OR expected_amount > 0)`

- **`salary_payments` (nova)**

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | UUID PK | `BaseEntity` |
| `salary_id` | UUID FK → `salaries` | NOT NULL |
| `user_id` | UUID FK → `users` | NOT NULL (regra "user_id em todas as tabelas") |
| `bank_account_id` | UUID FK → `bank_accounts` | NOT NULL; conta do usuário |
| `payment_date` | `DATE` | NOT NULL; **dentro do mês/ano da competência** |
| `amount` | `NUMERIC(12,2)` | NOT NULL; `> 0` |
| `description` | `VARCHAR(255)` | opcional |
| `created_date`, `updated_date` | `TIMESTAMPTZ` | `BaseEntity` |

  - Índices: `idx_salary_payments_salary (salary_id)`, `idx_salary_payments_user_date (user_id, payment_date)`

- **Regras de validação**:
  - `payment_date` precisa estar em `[1º dia, último dia]` da competência → senão **422 `PAYMENT_OUT_OF_COMPETENCE`**
  - `amount > 0`; `expected_amount > 0` ou `null`
  - `bankAccountId` deve pertencer ao usuário → senão 404 (padrão atual)
  - Recebido acima do total **não bloqueia** (D-3): o front mostra um aviso; o backend aceita
- **Persistência**: JPA. `SalaryPayment` com `@ManyToOne(fetch = LAZY)` para `Salary`, `User` e `BankAccount`. `Salary` **não** mapeia a coleção (consultas via repositório, evita N+1 e cascata implícita).
- **Cache**: nenhum
- **Compatibilidade retroativa**: **quebra** o contrato antigo de `/api/salaries` (POST/PUT/DELETE por id e GET de lista). Único consumidor é o próprio front, que é atualizado junto. Collection do Postman atualizada.
- **Migração de dados**: **nenhuma** — a base do Mac não tem salários (confirmado em 2026-10-04). Passo manual **único**, antes de subir o backend novo, porque `ddl-auto=update` não remove colunas nem relaxa `NOT NULL`:

```sql
-- tabela vazia; o Hibernate recria com o schema novo ao subir
DROP TABLE IF EXISTS salaries;
```

- **Estratégia de leitura e escrita**:
  - Leitura da tela: 1 query do cabeçalho por (user, ano, mês) + 1 query dos recebimentos por `salary_id` ordenados por `payment_date, created_date`
  - Escrita de recebimento: busca/cria o cabeçalho da competência na mesma transação

## 5. Interface design

- **Interfaces internas**:
  - `SalaryService.syncExpectedFromInvoice(UUID userId, int year, int month, BigDecimal amountOrNull)` — chamado pelo `PjEntryService` (ver CMP-04)
- **APIs externas**: nenhuma
- **Eventos assíncronos**: nenhum

- **Endpoints** (todos JWT, isolados por usuário):

| Método | Path | Body | Resposta | Comportamento |
|---|---|---|---|---|
| GET | `/api/salaries/{year}/{month}` | — | 200 `SalaryMonthResponse` | Sempre 200. Se não houver cabeçalho, retorna `id: null`, `expectedAmount: null`, `payments: []` |
| PUT | `/api/salaries/{year}/{month}` | `SalaryHeaderRequest` | 200 `SalaryMonthResponse` | Upsert do cabeçalho (total previsto + descrição) |
| POST | `/api/salaries/{year}/{month}/payments` | `SalaryPaymentRequest` | 201 `SalaryMonthResponse` | Cria recebimento; cria o cabeçalho se não existir |
| PUT | `/api/salaries/payments/{id}` | `SalaryPaymentRequest` | 200 `SalaryMonthResponse` | Edita recebimento (data continua presa à competência dele) |
| DELETE | `/api/salaries/payments/{id}` | — | 200 `SalaryMonthResponse` | Hard delete do recebimento |

  - Removidos: `GET /api/salaries`, `GET/PUT/DELETE /api/salaries/{id}`, `POST /api/salaries`
  - Todas as escritas devolvem o **mês inteiro atualizado**, assim o front re-renderiza o card e a tabela com 1 chamada só
  - `{year}` 2000–2100 e `{month}` 1–12 validados → 400 se fora

- **Formato dos payloads**:

```jsonc
// SalaryHeaderRequest
{ "expectedAmount": 20000.00, "description": "NF 123" }        // expectedAmount pode ser null

// SalaryPaymentRequest
{ "paymentDate": "2026-10-05", "amount": 8000.00,
  "bankAccountId": "uuid", "description": "1ª parcela" }       // description opcional

// SalaryMonthResponse
{
  "id": "uuid | null",
  "referenceYear": 2026, "referenceMonth": 10,
  "expectedAmount": 20000.00,          // null = não informado
  "expectedFromInvoice": true,         // true se há NF (INVOICE) na competência
  "receivedAmount": 15000.00,          // soma dos recebimentos
  "remainingAmount": 5000.00,          // null se expectedAmount null; pode ser negativo (D-3)
  "description": "NF 123",
  "payments": [
    { "id": "uuid", "paymentDate": "2026-10-05", "amount": 8000.00,
      "bankAccountId": "uuid", "bankAccountName": "Itaú", "description": "1ª parcela" }
  ]
}
```

- **Erros e códigos esperados**:

| Situação | Status | Código |
|---|---|---|
| `paymentDate` fora do mês da competência | 422 | `PAYMENT_OUT_OF_COMPETENCE` |
| Recebimento/conta de outro usuário ou inexistente | 404 | `NOT_FOUND` |
| Bean validation (`amount <= 0`, campos obrigatórios, ano/mês inválido) | 400 | padrão atual |

- **Autenticação ou autorização**: JWT + `CurrentUser.id()` em todas as queries (padrão)
- **Idempotência, retry, timeout e fallback**: PUT do cabeçalho é idempotente; demais seguem o padrão do projeto

## 6. Component design

### `CMP-01` Entidades `Salary` e `SalaryPayment`

- Responsabilidade: mapear `salaries` (alterada) e `salary_payments` (nova)
- Regras principais: `@Check` conforme seção 4; `SalaryPayment` com 3 `@ManyToOne(LAZY, optional = false)`
- Arquivos previstos: `model/Salary.java` (alterado), `model/SalaryPayment.java` (novo)

### `CMP-02` Repositórios

- `SalaryRepository`: `findByUserIdAndReferenceYearAndReferenceMonth(UUID, int, int)`; remover `findFiltered` e os `exists...` sem uso
- `SalaryPaymentRepository` (novo): `findByIdAndUserId`, `findBySalaryIdOrderByPaymentDateAscCreatedDateAsc`, `existsBySalaryId`
- Arquivos previstos: `repository/SalaryRepository.java` (alterado), `repository/SalaryPaymentRepository.java` (novo)

### `CMP-03` `SalaryService` (reescrito)

- Responsabilidade: agregado "salário do mês" — cabeçalho + recebimentos
- Inputs: competência (ano/mês), `SalaryHeaderRequest`, `SalaryPaymentRequest`
- Outputs: `SalaryMonthResponse`
- Regras principais:
  - `getMonth(year, month)` — monta a resposta (com ou sem cabeçalho); `expectedFromInvoice` via `PjEntryRepository.existsByUserIdAndYearAndMonthAndType(..., INVOICE)`
  - `upsertHeader(year, month, req)` — cria/atualiza cabeçalho
  - `addPayment(year, month, req)` — valida conta + data na competência; obtém/cria cabeçalho; salva
  - `updatePayment(id, req)` — valida dono, conta e data **contra a competência do cabeçalho do recebimento**
  - `deletePayment(id)` — hard delete; o cabeçalho permanece (pode ter total/descrição)
  - `syncExpectedFromInvoice(userId, year, month, amountOrNull)`:
    - `amount != null` → obtém/cria cabeçalho e grava `expected_amount = amount`
    - `amount == null` (NF excluída) → se o cabeçalho não tem recebimentos e não tem descrição, **apaga o cabeçalho**; senão grava `expected_amount = null`
- Casos de falha: data fora da competência → `SalaryPaymentOutOfCompetenceException` (nova, 422)
- Arquivos previstos: `service/SalaryService.java`, `exception/SalaryPaymentOutOfCompetenceException.java` (novo), `exception/ApiErrorHandler.java` (+ handler), `exception/DuplicateSalaryException.java` (**removida** — deixa de ter uso)

### `CMP-04` Integração com o módulo PJ

- Responsabilidade: manter o total previsto igual à NF da competência
- Regras principais (somente quando o tipo envolvido é `INVOICE`), dentro da mesma transação do `PjEntryService`:
  - `create` de INVOICE → `sync(ano, mês, amount)`
  - `update` de INVOICE → se mudou a competência: `sync(antigo, null)` + `sync(novo, amount)`; senão `sync(atual, amount)`
  - `update` que troca o tipo de/para INVOICE → trata como exclusão/criação da NF
  - `delete` de INVOICE → `sync(ano, mês, null)`
- Arquivos previstos: `service/PjEntryService.java` (alterado)

### `CMP-05` DTOs, mapper e controller

- DTOs novos (records): `SalaryHeaderRequest`, `SalaryPaymentRequest`, `SalaryMonthResponse`, `SalaryPaymentResponse`
- DTOs removidos: `SalaryRequest`, `SalaryResponse`
- `SalaryMapper`: `SalaryPayment → SalaryPaymentResponse` (conta: id + nome); a montagem do `SalaryMonthResponse` fica no service (tem somatórios)
- `SalaryController`: 5 endpoints da seção 5
- Arquivos previstos: `dto/*`, `mapper/SalaryMapper.java`, `controller/SalaryController.java`

### `CMP-06` Dashboard

- `DashboardRepository.sumSalary(userId, year, month)` passa a ser:

```sql
SELECT COALESCE(SUM(p.amount), 0)
  FROM SalaryPayment p
 WHERE p.user.id = :userId
   AND p.salary.referenceYear = :year
   AND p.salary.referenceMonth = :month
```

- `DashboardService`, `BalanceResponse` e tela do dashboard **sem mudança**
- Arquivos previstos: `repository/DashboardRepository.java`

## 7. UI and interaction design

- **Telas alteradas**: `/salaries` (`pages/salaries/SalariesPage.tsx`, reescrita)

```
Salários                                         [Outubro ▾] [2026 ▾]
Recebimentos por competência
┌───────────────────────────────────────────────────────────────────┐
│ Total a receber        Recebido            Falta                   │
│ R$ 20.000,00 (da NF)   R$ 15.000,00        R$ 5.000,00             │
│ ███████████████░░░░░ 75%                       [✏️ Editar total]   │
└───────────────────────────────────────────────────────────────────┘
                                             [+ Registrar recebimento]
 DATA         VALOR          CONTA      DESCRIÇÃO         AÇÕES
 05/10/2026   R$ 8.000,00    Itaú       1ª parcela        ✏️ 🗑
 15/10/2026   R$ 7.000,00    Itaú       —                 ✏️ 🗑
```

- **Componentes novos**:
  - `pages/salaries/SalarySummaryCard.tsx` — total / recebido / falta + barra de progresso (cap visual em 100%) + botão "Editar total"; rótulo "(da NF)" quando `expectedFromInvoice`
  - `pages/salaries/SalaryPaymentFormModal.tsx` — data (`<input type="date">` com `min`/`max` = 1º e último dia da competência; default = hoje se estiver no mês, senão dia 1), valor (`CurrencyInput`), conta (`Select`, default = última conta usada), descrição; passo de **confirmação** igual aos demais cadastros
  - `pages/salaries/SalaryTotalModal.tsx` — edita total previsto (vazio = não informado) e descrição; se `expectedFromInvoice`, mostra aviso "Este total vem da NF; ao alterar a NF ele será sobrescrito"
- **Componentes alterados**: `services/salaryService.ts`, `types/salary.ts`
- **Componentes removidos**: `pages/salaries/SalaryFormModal.tsx`
- **Estados visuais**:
  - loading: skeleton do card + `Table` em loading
  - vazio (sem cabeçalho e sem recebimentos): card com "Total a receber: não informado" + botão "Informar total"; tabela com "Nenhum recebimento neste mês."
  - total não informado: card mostra só "Recebido"; sem barra e sem "Falta"
  - recebido > total (D-3): "Falta" em âmbar como "Excedente R$ X"; no modal, aviso não bloqueante "Com este valor o recebido passa do total previsto"
  - erro: toast com `extractApiError`
  - sucesso: toast "Recebimento registrado/atualizado/removido", "Total atualizado"
- **Navegação**: mesmo item de menu "Salários" (`/salaries`); filtro mês/ano começa no **mês atual** (mesmo padrão da tela PJ: `MONTHS`, `yearRange`)
- **"Última conta usada"**: `localStorage` `financial.salary.lastBankAccountId` (try/catch; fallback = 1ª conta ativa)
- **Responsividade/Acessibilidade**: mesmos padrões das telas existentes (card empilha no mobile; botões com `title`)
- **Regras de conteúdo**: valores em `formatCurrency`; datas `dd/MM/yyyy`; competência com `monthLabel`

## 8. Runtime and operations

- Configuração / feature flags: nenhuma
- Logs: `INFO` ao sincronizar total pela NF (`Salário {mm/aaaa}: total previsto sincronizado pela NF`)
- Rollout:
  1. Rodar o `DROP TABLE IF EXISTS salaries;` (seção 4) no Postgres do Mac
  2. `docker compose up -d --build` (backend + frontend)
  3. Reindex do chat RAG depois do merge (a spec nova entra no corpus)
- Rollback: voltar a imagem anterior + `DROP TABLE salary_payments; DROP TABLE salaries;` (Hibernate recria o schema antigo). Perde os recebimentos lançados — aceitável no momento (base nova).

## 9. Security, privacy and compliance

- Dados sensíveis: valores de renda (já existentes); sem dados novos de natureza diferente
- Regras de acesso: toda leitura/escrita filtrada por `CurrentUser.id()`; conta bancária e recebimento validados como do usuário (404 caso contrário)
- Controles: CSRF/JWT/rate limit já existentes; nada novo

## 10. Requirement mapping

### `REQ-01` Total previsto do mês

- `source_requirement`: "lançar o saldo total de salário que eles me pagam no mês e esse total ficar aparecendo em cima da tabela"
- Interpretação técnica: `salaries.expected_amount` (opcional) exibido no `SalarySummaryCard`
- Critério de aceite: informar/editar/limpar o total pela tela; card reflete na hora
- Testes: manual + integração do PUT do cabeçalho

### `REQ-02` Recebimentos datados

- `source_requirement`: "lançar o valor que recebi, no dia X, com mês e ano conforme a combo"
- Interpretação técnica: CRUD de `salary_payments` com data presa à competência (D-1)
- Critério de aceite: criar/editar/excluir; data fora do mês → 422 e o date picker nem permite escolher
- Testes: unit das regras de data; manual

### `REQ-03` Dashboard considera só o recebido

- `source_requirement`: "no dashboard a gente considera apenas os valores que eu for lançando"
- Interpretação técnica: `sumSalary` soma `salary_payments`
- Critério de aceite: com total R$ 20.000 e recebidos R$ 15.000 → KPI Salário = R$ 15.000; saldo recalculado
- Testes: manual no dashboard

### `REQ-04` Total vem da NF

- `source_requirement`: "já pode vir preenchido quando eu lançar a nota"
- Interpretação técnica: CMP-04 (sync na criação/edição/exclusão da INVOICE)
- Critério de aceite: lançar NF de R$ 16.000 em 10/2026 → tela de salários de 10/2026 mostra "R$ 16.000,00 (da NF)"; editar NF para R$ 18.000 → total atualiza; excluir NF → total "não informado"
- Testes: manual + unit do sync

### `REQ-05` Conta por recebimento

- `source_requirement`: sugestão 2 aprovada
- Critério de aceite: cada recebimento tem conta; modal vem com a última usada

### `REQ-06` Histórico

- `source_requirement`: "ter um histórico de quando me pagaram e que dia"
- Interpretação técnica: navegar pelos meses no filtro mostra os recebimentos de cada competência
- Critério de aceite: meses anteriores exibem seus recebimentos com data

## 11. Implementation plan input

| Sub-WORK | Objetivo | Arquivos alvo | Como validar |
|---|---|---|---|
| WORK-30.1 | Entidades + repositórios | `model/Salary`, `model/SalaryPayment`, `repository/*` | sobe com `ddl-auto` e cria `salary_payments` |
| WORK-30.2 | Service + exceção + handler | `service/SalaryService`, `exception/*` | unit tests |
| WORK-30.3 | DTOs + mapper + controller | `dto/*`, `mapper/SalaryMapper`, `controller/SalaryController` | curl dos 5 endpoints |
| WORK-30.4 | Sync com NF | `service/PjEntryService` | criar/editar/excluir NF e conferir o total |
| WORK-30.5 | Dashboard | `repository/DashboardRepository` | KPI Salário = soma recebida |
| WORK-30.6 | Front: tipos + service | `types/salary.ts`, `services/salaryService.ts` | `tsc` limpo |
| WORK-30.7 | Front: página + card + modais | `pages/salaries/*` | teste manual da seção 12 |
| WORK-30.8 | Postman + docs | `postman/*.json`, este arquivo | collection roda |

- Pré-requisitos: P-1 (seção 13); passo manual do `DROP TABLE` antes do 30.1 rodar contra o banco
- Dependências: 30.2 → 30.3 → 30.6/30.7; 30.4 e 30.5 dependem de 30.1/30.2
- Pode ser paralelo: `não` (execução sequencial por um único agente)

## 12. Test plan

- **Testes unitários** (novos, Mockito — `SalaryServiceTest`):
  - recebimento no 1º e no último dia do mês → ok; dia anterior/posterior → `SalaryPaymentOutOfCompetenceException`
  - 1º recebimento cria o cabeçalho; 2º reaproveita
  - `remainingAmount` null sem total; negativo quando recebido > total
  - sync NF: cria cabeçalho; atualiza valor; exclusão sem recebimentos apaga o cabeçalho; exclusão com recebimentos só zera o total
  - conta de outro usuário → `ResourceNotFoundException`
- **Testes de integração**: não há infraestrutura (Testcontainers) no projeto hoje — fora de escopo
- **Testes manuais** (Docker, `http://localhost`):
  1. Mês sem nada → card "não informado" + tabela vazia
  2. Lançar NF de outubro no PJ → total aparece "(da NF)"
  3. Registrar 2 recebimentos → card, barra e "Falta" corretos; dashboard mostra a soma
  4. Editar data de um recebimento para outro mês → date picker não permite; via API → 422
  5. Registrar acima do total → aviso âmbar, salva
  6. Editar total manualmente → atualiza; editar a NF → sobrescreve
  7. Excluir recebimento → card e dashboard atualizam
  8. Trocar mês/ano no filtro → histórico do mês selecionado
- **Regressões obrigatórias**: dashboard (KPIs, pizza, portfólio), tela PJ (CRUD da NF continua funcionando com upload), chat

## 13. Open items

- **Bloqueios**:
  - **P-1**: a `master` ainda **não** tem os commits da `fix/setup-macos` (imagem do MinIO, HSTS, `mvnw`). Uma branch criada a partir da `master` atual faz o `docker compose` tentar baixar `minio/minio`, que não existe mais. **Recomendação: fazer o merge da `fix/setup-macos` na `master` antes de criar a branch da WORK-30.** Lembrete: push na `master` dispara o workflow de publicação no GHCR.
- **Riscos**:
  - Base do Windows (com salários antigos) fica incompatível com o schema novo — fora de escopo; se um dia for usada, precisa de script de conversão (cada salário vira cabeçalho com `expected_amount = amount` + 1 recebimento no dia 1)
- **Decisões tomadas** (aprovadas por Diego em 2026-10-04):
  - **D-1**: data do recebimento sempre dentro do mês da competência
  - **D-2**: conta bancária em cada recebimento, default = última usada
  - **D-3**: total opcional; recebido acima do total só gera aviso (não bloqueia)
  - **D-4**: total previsto preenchido pela NF do módulo PJ; alterar a NF sobrescreve o total
- **Decisões pendentes**: nenhuma
- **Assunções temporárias**:
  - Rescisão parcelada será tratada em spec futura e pode reaproveitar `salary_payments`

## Critério de "pronto"

```
[ ] DROP TABLE salaries executado; backend sobe e cria salary_payments
[ ] 5 endpoints funcionando; endpoints antigos removidos
[ ] 422 PAYMENT_OUT_OF_COMPETENCE para data fora do mês
[ ] NF criada/alterada/excluída sincroniza o total
[ ] Dashboard soma só os recebimentos
[ ] Tela /salaries com filtro, card e tabela conforme seção 7
[ ] SalaryServiceTest passando; tsc e lint do front limpos
[ ] Testes manuais 1–8 ok
[ ] Diego aprova explicitamente → commit na feature/work-30-salary-payments
```
