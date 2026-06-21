# Spec — Separação de `purchase_date` e `first_due_date` em Despesas INSTALLMENT

## Metadados

- **spec_id:** `WORK-09D`
- **titulo_tecnico:** Introduzir `first_due_date` como o gatilho do cronograma de parcelas, desacoplando da data factual da compra
- **source_product_spec:** Feedback do smoke test da WORK-09C (2026-06-09) — Diego identificou que o modelo atual mistura conceitos: a "Data da compra" é usada tanto como informação histórica quanto como base para o cálculo do `due_date` da primeira parcela. Isso obriga o usuário a "mentir" sobre a data real da compra quando o ciclo do cartão de crédito não cai exatamente em `purchase_date + 1 mês`.
- **source_product_spec_version:** v1 — 2026-06-09
- **baseline_branch_or_commit:** estado pós-WORK-09C (visibilidade de despesas no dashboard e listagem)
- **target_branch:** main
- **escopo_sistema:** `financial` (backend) + `financial-front` (SPA)
- **última_atualização:** 2026-06-09

---

## 1. Objective do documento

**O que esta spec permite:**
1. Modelar corretamente a relação entre a data real da compra e o cronograma de pagamento de despesas parceladas.
2. Permitir que o usuário registre uma compra parcelada respeitando o ciclo de fechamento do cartão de crédito (ex: comprou hoje 09/06, primeira parcela vence 10/07 porque é o vencimento da fatura).
3. Tornar `purchase_date` puramente histórico (informação imutável de quando a compra ocorreu).

**O que esta spec não cobre:**
- Recálculo retroativo de installments de despesas INSTALLMENT já existentes (ficam com `first_due_date` NULL, parcelas preservadas).
- Cadastro de "data de fechamento" e "vencimento" do cartão como entidade separada (`Card`) — backlog futuro.
- Suporte a parcelas com intervalo diferente de 1 mês (ex: bimestral, trimestral).
- Ajuste do dia de vencimento entre parcelas (ex: 1ª no dia 10, 2ª no dia 5 do mês seguinte). Cronograma rígido: `parcela N = first_due_date + (N-1) meses`.

**Artefatos complementares:**
- `docs/specs/work-06-expenses-installments.md` — spec original da geração de parcelas.
- `docs/specs/work-09b-variable-expense-type.md` — introdução do tipo VARIABLE.
- `docs/specs/work-09c-dashboard-installment-visibility.md` — semântica de visibilidade nos meses.

---

## 2. System overview

**Estado atual:**
- Entidade `Expense` tem apenas `purchase_date`.
- `InstallmentService.generateForExpense` calcula `due_date_N = purchase_date.plusMonths(n)` com `n` começando em **1** (primeira parcela é sempre 1 mês após a compra).
- Resultado: o usuário não consegue alinhar a 1ª parcela com o vencimento real do cartão sem distorcer a data da compra.

**Estado alvo:**
- Entidade `Expense` ganha campo `first_due_date` (nullable, obrigatório para INSTALLMENT, proibido para FIXED/VARIABLE).
- `InstallmentService.generateForExpense` calcula `due_date_N = first_due_date.plusMonths(n - 1)` com `n` começando em **1** (primeira parcela é exatamente `first_due_date`).
- `purchase_date` continua existindo como informação histórica imutável.

**Delta técnico:**

| Camada | Mudanças |
|---|---|
| Schema | +1 coluna `first_due_date DATE NULL` (Hibernate `ddl-auto=update`) |
| Backend domain | +1 campo na entidade `Expense` |
| Backend DTOs | +1 campo em `ExpenseRequest` e `ExpenseResponse` |
| Backend services | Validação em `ExpenseService`; cálculo novo em `InstallmentService` |
| Backend mapper | MapStruct gera mapeamento automático |
| Frontend types | +1 campo em `Expense` e `ExpenseRequest` |
| Frontend form | Novo campo condicional no `ExpenseFormModal` |
| Frontend listagem | Sem mudança |

**Escopo explícito:**
- Modelagem do campo no domínio, persistência, DTOs, mapper, serviço, validações.
- Geração de parcelas pela nova regra.
- UI: campo no formulário com validações client-side, default sugerido, posicionamento visual.

**Fora de escopo:**
- Recálculo de installments de registros pré-existentes.
- Exibição de `first_due_date` em telas de visualização (listagem permanece sem essa coluna por enquanto).
- Mudança nas regras de filtro do `ExpenseSpecifications`.

**Restrições obrigatórias:**
- Backward compatibility: registros INSTALLMENT pré-existentes não devem quebrar. `first_due_date` NULL é aceitável para eles porque as parcelas já estão geradas.
- Regras de negócio no backend (fonte de verdade). Frontend pode validar para UX, mas o backend é definitivo.
- `user_id` continua isolando todas as queries.
- Soft-delete mantido.
- Sem migrations Flyway/Liquibase (Hibernate cuida).

---

## 3. Architecture design

**Arquitetura atual relevante:** sem mudança estrutural. As alterações são intra-componentes existentes.

```
ExpenseController → ExpenseService.create
                       │
                       ├── valida tipo + firstDueDate (← novo)
                       ├── persiste Expense (com firstDueDate) (← novo)
                       └── InstallmentService.generateForExpense
                              │
                              └── base = firstDueDate (← era purchaseDate)
                                  due_date_N = base.plusMonths(n - 1) (← era plusMonths(n))
```

**Componentes impactados:**
- `Expense` (entity)
- `ExpenseRequest` / `ExpenseResponse` (DTOs)
- `ExpenseMapper` (MapStruct)
- `ExpenseService` (validações)
- `InstallmentService` (cálculo de due_date)

**Trade-offs:**
- **Migração**: optamos por não recalcular installments existentes. Justificativa: as parcelas já estão geradas e podem ter `due_date` divergente do que `first_due_date` calcularia. Recalcular pode causar perda de informação histórica (ex: parcela marcada como PAID na data X). Compatível com auditoria.
- **Validação de invariante `first_due_date >= purchase_date`**: impede que a 1ª parcela seja antes da compra (sem sentido). Custo: pequena complexidade extra na validação.
- **Campo nullable**: simplifica suporte a FIXED/VARIABLE no mesmo schema. Custo: necessidade de validação aplicacional (não DB-level) para garantir presença em INSTALLMENT.
- **Não criar entidade `Card` ainda**: postergado. Quando existir, `first_due_date` poderá ser auto-calculado a partir da data da compra + ciclo do cartão. Por enquanto, usuário informa manualmente.

---

## 4. Data design

**Entidade impactada:** `Expense` (tabela `expenses`).

**Coluna nova:**
| Nome | Tipo | Nulidade | Default | Descrição |
|---|---|---|---|---|
| `first_due_date` | `DATE` | `NULL` | — | Data de vencimento da 1ª parcela. Obrigatório para INSTALLMENT (validado em app). Proibido para FIXED/VARIABLE. |

**Mudança via Hibernate:** `ddl-auto=update` adiciona a coluna automaticamente no startup. Sem CHECK constraint (validação fica na aplicação).

**Regras de validação (em `ExpenseService`):**

| Tipo | `first_due_date` | Se inválido |
|---|---|---|
| FIXED | obrigatório `null` | `422 FIRST_DUE_DATE_NOT_ALLOWED` |
| INSTALLMENT | obrigatório `not null` E `>= purchase_date` | `422 INSTALLMENT_REQUIRES_FIRST_DUE_DATE` ou `422 FIRST_DUE_DATE_BEFORE_PURCHASE` |
| VARIABLE | obrigatório `null` | `422 FIRST_DUE_DATE_NOT_ALLOWED` |

**Persistência:**
- INSTALLMENT: persiste `first_due_date` informado pelo usuário.
- FIXED/VARIABLE: persiste `null` (mesmo que o cliente mande algo — ignora silenciosamente após validação acima).

**Compatibilidade retroativa:**
- INSTALLMENTs antigas no banco ficam com `first_due_date = NULL`. Não há regeneração de parcelas.
- O campo aparece como `null` no JSON de resposta para essas despesas.
- O frontend trata `null` na exibição (caso ela apareça em telas futuras).

---

## 5. Interface design

### `POST /api/expenses`

**Request (INSTALLMENT) — antes:**
```json
{
  "description": "Bicicleta",
  "totalAmount": 1500.00,
  "expenseType": "INSTALLMENT",
  "installmentsCount": 3,
  "purchaseDate": "2026-06-09",
  "categoryId": "...",
  "bankAccountId": "..."
}
```

**Request (INSTALLMENT) — depois:**
```json
{
  "description": "Bicicleta",
  "totalAmount": 1500.00,
  "expenseType": "INSTALLMENT",
  "installmentsCount": 3,
  "purchaseDate": "2026-06-09",
  "firstDueDate": "2026-07-10",  
  "categoryId": "...",
  "bankAccountId": "..."
}
```

**Request (FIXED/VARIABLE):** `firstDueDate` deve ser ausente ou `null`.

**Response (`ExpenseResponse`):** ganha campo `firstDueDate: string | null` (ISO date).

**Erros novos:**

| HTTP | Code | Quando |
|---|---|---|
| 422 | `INSTALLMENT_REQUIRES_FIRST_DUE_DATE` | INSTALLMENT sem `firstDueDate` |
| 422 | `FIRST_DUE_DATE_NOT_ALLOWED` | FIXED ou VARIABLE com `firstDueDate` não-nulo |
| 422 | `FIRST_DUE_DATE_BEFORE_PURCHASE` | `firstDueDate < purchase_date` |

### `PUT /api/expenses/{id}`

**Sem mudança.** `ExpenseUpdateRequest` já é restrito a `description`, `categoryId`, `bankAccountId`. Não permite alterar `firstDueDate` (mesma razão de não permitir alterar tipo/parcelas: precisaria recalcular installments — risco de inconsistência com parcelas já pagas).

### `GET /api/expenses/{id}` e `GET /api/expenses`

**Mudança:** `firstDueDate` passa a aparecer na resposta. Frontend lê o campo (mesmo que não exiba ainda).

---

## 6. Component design

### Backend — `Expense.java`
```java
@Column(name = "first_due_date")
private LocalDate firstDueDate;
```
(Adicionado abaixo de `purchaseDate`. Lombok cuida do getter/setter via `@Data` ou similar — verificar padrão do projeto.)

### Backend — `ExpenseRequest.java`
```java
private LocalDate firstDueDate;  // validado contextualmente no Service
```

### Backend — `ExpenseResponse.java`
```java
private LocalDate firstDueDate;  // null para FIXED/VARIABLE
```

### Backend — `ExpenseService.create`
Adicionar validações antes do `Expense.builder()`:
```java
if (request.expenseType() == ExpenseType.INSTALLMENT) {
    if (request.firstDueDate() == null) {
        throw new InvalidExpenseTypeException("firstDueDate é obrigatório para INSTALLMENT");
    }
    if (request.firstDueDate().isBefore(request.purchaseDate())) {
        throw new InvalidExpenseTypeException("firstDueDate não pode ser anterior à purchaseDate");
    }
} else {
    if (request.firstDueDate() != null) {
        throw new InvalidExpenseTypeException("firstDueDate só é permitido para INSTALLMENT");
    }
}
```

Builder:
```java
.firstDueDate(request.expenseType() == ExpenseType.INSTALLMENT
        ? request.firstDueDate() : null)
```

### Backend — `InstallmentService.generateForExpense`
```java
LocalDate base = expense.getFirstDueDate();  // antes: expense.getPurchaseDate()
// ...
LocalDate dueDate = base.plusMonths(n - 1L);  // antes: base.plusMonths(n) com n iniciando em 1
```

### Backend — `ExpenseMapper` (MapStruct)
Adicionar `@Mapping(source = "firstDueDate", target = "firstDueDate")` se MapStruct não inferir automaticamente. Geralmente nomes iguais são auto-mapeados.

### Frontend — `types/expense.ts`
```ts
export type Expense = {
  // ... existing
  firstDueDate: string | null;
};

export type ExpenseRequest = {
  // ... existing
  firstDueDate?: string | null;
};
```

### Frontend — `pages/expenses/ExpenseFormModal.tsx`
- Estado novo: `firstDueDate: string` (ISO date)
- Campo condicional: renderiza apenas quando `expenseType === 'INSTALLMENT'`
- Default ao mudar para INSTALLMENT: `purchaseDate + 30 dias` (calculado via `date-fns`: `addDays(parseISO(purchaseDate), 30)`)
- Validação client-side:
  - Se INSTALLMENT e `firstDueDate` vazio → erro
  - Se `firstDueDate < purchaseDate` → erro
- Envio: `firstDueDate` no payload apenas se INSTALLMENT, senão `null`

**Layout do formulário:**
```
Descrição: [_____________________________]
[Tipo: INSTALLMENT v]    [Data da compra: 2026-06-09]
[Total (R$): 1500.00]    [Nº de parcelas: 3]
[Vencimento da 1ª parcela: 2026-07-10]          ← linha inteira, só se INSTALLMENT
[Categoria: v]           [Conta bancária: v]
```

---

## 7. UI and interaction design

**Tela alterada:** `ExpenseFormModal` (criar despesa).

**Fluxo:**
1. Usuário escolhe tipo = INSTALLMENT.
2. Campo "Vencimento da 1ª parcela" aparece, pré-preenchido com `purchaseDate + 30 dias`.
3. Usuário pode ajustar (ex: 10/07/2026).
4. Salvar → backend gera parcelas em 10/07, 10/08, 10/09 (para 3 parcelas).

**Mensagens de erro (UX):**
- "Vencimento da 1ª parcela é obrigatório"
- "Vencimento da 1ª parcela não pode ser anterior à data da compra"

**Estados visuais:**
- Campo escondido para FIXED/VARIABLE.
- Quando aparece: input `type="date"` igual ao campo `purchase_date`.

**Mudança de tipo no formulário:**
- INSTALLMENT → FIXED: limpa `firstDueDate` no estado interno.
- FIXED → INSTALLMENT: preenche `firstDueDate` com `purchaseDate + 30 dias`.

---

## 8. Runtime and operations

Sem impacto operacional. Nenhuma migração de dados, nenhum job de recálculo, nenhum config novo.

---

## 9. Security, privacy and compliance

Sem impacto. Campo é apenas data, sem informação sensível adicional. Filtros por `user_id` mantidos.

---

## 10. Requirement mapping

- **REQ-04 (Cadastro de Despesa):** refinado. A regra "compra parcelada gera N parcelas" passa a ser parametrizada pela data de vencimento da 1ª parcela, não pela data da compra.

---

## 11. Implementation plan

### Checklist

**Backend (`D:\workspace\financial`):**
- [ ] `src/main/java/.../model/Expense.java` — adicionar campo `firstDueDate`
- [ ] `src/main/java/.../dto/ExpenseRequest.java` — adicionar campo `firstDueDate`
- [ ] `src/main/java/.../dto/ExpenseResponse.java` — adicionar campo `firstDueDate`
- [ ] `src/main/java/.../service/ExpenseService.java` — validações + persistência
- [ ] `src/main/java/.../service/InstallmentService.java` — usar `firstDueDate` como base, `n - 1` no `plusMonths`
- [ ] Verificar `ExpenseMapper` — MapStruct deve inferir; se não, adicionar `@Mapping`

**Frontend (`D:\workspace\financial-front`):**
- [ ] `src/types/expense.ts` — adicionar `firstDueDate` em `Expense` e `ExpenseRequest`
- [ ] `src/pages/expenses/ExpenseFormModal.tsx` — estado, campo condicional, default, validações, envio

**Validação:**
- [ ] `mvnw clean compile` — sem erros
- [ ] `npx tsc --noEmit` — sem erros
- [ ] Reiniciar backend (Eclipse) — Hibernate adiciona coluna
- [ ] Verificar via DBeaver: `expenses` tem coluna `first_due_date DATE NULL`

---

## 12. Test plan

**Manual (smoke test):**

1. **Criar INSTALLMENT com firstDueDate:**
   - Form: tipo=INSTALLMENT, purchaseDate=09/06/2026, firstDueDate=10/07/2026, 3 parcelas, R$ 1500
   - Esperado: 200/201 OK. Instalações geradas: 10/07/2026, 10/08/2026, 10/09/2026
   - Verificar via DBeaver: `SELECT due_date FROM installments WHERE expense_id = ...`

2. **Criar INSTALLMENT sem firstDueDate (regressão):**
   - Backend deve retornar `422 INSTALLMENT_REQUIRES_FIRST_DUE_DATE`
   - Frontend bloqueia client-side

3. **Criar INSTALLMENT com firstDueDate < purchaseDate:**
   - Esperado: `422 FIRST_DUE_DATE_BEFORE_PURCHASE`

4. **Criar FIXED ou VARIABLE com firstDueDate:**
   - Esperado: `422 FIRST_DUE_DATE_NOT_ALLOWED`
   - Frontend não envia o campo nesses casos (validação preventiva)

5. **Listagem (regressão WORK-09C):**
   - INSTALLMENT com purchase=09/06 e firstDue=10/07 deve aparecer **só em Julho/2026** e meses subsequentes (1ª parcela em Julho).
   - **NÃO** deve aparecer em Junho/2026 (não há parcela vencendo lá).

6. **Dashboard (regressão WORK-09C):**
   - Junho/2026: não soma a nova INSTALLMENT (sem parcela).
   - Julho/2026: soma R$ 500 (1ª parcela).
   - Agosto/2026: soma R$ 500 (2ª).
   - Setembro/2026: soma R$ 500 (3ª).

7. **INSTALLMENTs antigas (Bicicleta, Notebook, Curso, Despesa Teste installment):**
   - Continuam aparecendo nos meses das parcelas (sem mudança).
   - `firstDueDate` aparece como `null` no GET de detalhe.
   - Não há regeneração.

8. **Cancel:**
   - Cancelar a nova INSTALLMENT → parcelas PENDING viram CANCELLED. Sem mudança nesse fluxo.

---

## 13. Open items

| # | Item | Decisão |
|---|---|---|
| O-01 | Backfill de `first_due_date` para INSTALLMENTs antigas | Não fazer. Custo > benefício. Aceitar `null` nesses registros. |
| O-02 | Default no front: `purchaseDate + 30 dias` é arbitrário | Aceito por ora. Quando houver entidade `Card`, o default vira `próximo fechamento + 1 dia`. |
| O-03 | Validação de `firstDueDate < hoje` (parcela já no passado?) | Permitir. Faz sentido para registrar compras antigas retroativamente. |
| O-04 | Exibir `firstDueDate` na listagem | Fora de escopo. Backlog. |
| O-05 | Permitir editar `firstDueDate` em INSTALLMENT existente | Fora de escopo. Risco de inconsistência com parcelas já pagas. Backlog. |
| O-06 | Entidade `Card` (fechamento + vencimento) para auto-calcular `firstDueDate` | Backlog futuro. Mencionado em §3. |
