# Spec WORK-06 — Despesas + Installments (a mais complexa)

> Fase 6. Criar Expense FIXED ou INSTALLMENT com geração automática de parcelas; cancelamento com cascata.

---

## Metadados
- **spec_id:** `WORK-06`
- **titulo_tecnico:** CRUD de `Expense` (FIXED ou INSTALLMENT) + geração automática de `Installment`s; cancelamento com cascata para parcelas pendentes
- **source_product_spec:** `PLAN-01`
- **baseline:** pós-WORK-05
- **target_branch:** `feature/work-06-expenses`
- **escopo_sistema:** `financial`
- **última_atualização:** 2026-05-31

---

## 1. Objective
Endpoint que cria uma despesa; se INSTALLMENT, gera N linhas em `installments`. Endpoint de cancelamento que marca expense + parcelas pendentes como CANCELLED, deixando pagas. Update permite mudar campos não-críticos (descrição, categoria, conta), mas **não** muda tipo ou número de parcelas (precisa cancelar + recriar).

**Fora:** "adiantar parcela" (spec separada futura — D-02). Dashboard (WORK-07).

---

## 2. System overview
- **Atual:** WORK-05 entregou Salary; entidades Expense + Installment já existem (WORK-02) mas sem service/controller.
- **Alvo:** CRUD completo `/api/expenses` + endpoint `/api/expenses/{id}/cancel`. Geração de parcelas automática. Listagem de parcelas via `/api/expenses/{id}/installments`.

---

## 3. Architecture
Inclui um `InstallmentService` separado (encapsula geração e cancelamento das parcelas). `ExpenseService` orquestra.

---

## 4. Data design
- Sem mudança de schema.
- **Regra de geração de parcelas (INSTALLMENT):**
  - `amount` da parcela = `total_amount / installments_count` (arredondado a 2 casas; a última parcela absorve diferença de centavos por arredondamento).
  - `due_date` da parcela N = `purchase_date + N meses` (mantendo o dia; se o mês não tiver o dia, usa último dia do mês).
  - `status` inicial: `PENDING`.

- **Regra de cancelamento (Expense):**
  - `expenses.status = CANCELLED`, `cancelled_at = now()`.
  - Todas parcelas com `status = PENDING` viram `CANCELLED`.
  - Parcelas `PAID` ou `ANTICIPATED` ficam intactas.

---

## 5. Interface design

| Método | Path | Auth | Comportamento |
|---|---|---|---|
| GET | `/api/expenses` | JWT | Lista do user. Filtros: `?year=&month=` (parcelas com due_date no mês OU FIXED ativas no mês), `?status=ACTIVE/CANCELLED`, `?categoryId=`, `?bankAccountId=`. |
| GET | `/api/expenses/{id}` | JWT | Detalhe com `installments[]` se INSTALLMENT. |
| POST | `/api/expenses` | JWT | Cria. Veja DTO abaixo. **422** se INSTALLMENT sem `installmentsCount`. |
| PUT | `/api/expenses/{id}` | JWT | Atualiza apenas: `description`, `categoryId`, `bankAccountId`. **Não** muda type/total/parcelas. |
| POST | `/api/expenses/{id}/cancel` | JWT | Soft-cancel com cascata. 204. |
| GET | `/api/expenses/{id}/installments` | JWT | Lista parcelas da expense. |

**`ExpenseRequest` (record):**
```json
{
  "description": "Geladeira Brastemp",
  "totalAmount": 1000.00,
  "expenseType": "INSTALLMENT",
  "installmentsCount": 10,
  "purchaseDate": "2026-06-15",
  "categoryId": "uuid",
  "bankAccountId": "uuid"
}
```

**`ExpenseResponse`:**
```json
{
  "id": "uuid",
  "description": "...",
  "totalAmount": 1000.00,
  "expenseType": "INSTALLMENT",
  "status": "ACTIVE",
  "purchaseDate": "2026-06-15",
  "installmentsCount": 10,
  "category": {"id":"...","name":"..."},
  "bankAccount": {"id":"...","name":"..."},
  "installments": [
    {"id":"...","number":1,"dueDate":"2026-07-15","amount":100.00,"status":"PENDING"},
    ...
  ]
}
```

---

## 6. Component design

- `ExpenseRepository` — métodos com filtros, fetch join para installments quando necessário.
- `InstallmentRepository` — `findByExpenseIdOrderByInstallmentNumber(UUID)`.
- `InstallmentService` — `generateForExpense(Expense)`, `cancelPendingFor(Expense)`.
- `ExpenseService` — orquestra: cria expense → se INSTALLMENT, chama `InstallmentService.generateForExpense`. Cancel: marca expense + delega cancel das parcelas.
- `ExpenseController` — 6 endpoints.
- DTOs: `ExpenseRequest`, `ExpenseResponse`, `InstallmentResponse`, `ExpenseUpdateRequest` (subset de campos editáveis).
- Mapper MapStruct.
- `InvalidExpenseTypeException` → 422.
- `ExpenseCancellationException` → 422 (se já está CANCELLED).

---

## 7. UI
N/A (vem na WORK-09 — tela com modal "deseja cancelar?").

---

## 8. Runtime/ops
Sem novas env vars.

---

## 9. Security
Igual aos demais. **Atenção:** ao buscar expense + installments, garantir que TODAS as queries filtram por `user_id` da expense pai (não permitir vazamento).

---

## 10. Requirement mapping
- **REQ-04** (Despesas, parte principal) ✅. "Adiantar parcela" fica para spec futura.

---

## 11. Implementation plan input

| Sub-WORK | Objetivo |
|---|---|
| WORK-06.1 | Repositories (Expense + Installment) com queries customizadas |
| WORK-06.2 | `InstallmentService.generateForExpense` (cálculo + arredondamento) |
| WORK-06.3 | `ExpenseService.create` (orquestra geração) |
| WORK-06.4 | `ExpenseService.cancel` (cascata) |
| WORK-06.5 | `ExpenseService.update` (limitado) |
| WORK-06.6 | `ExpenseService.list` com filtros (year/month combina FIXED + parcelas INSTALLMENT do mês) |
| WORK-06.7 | `ExpenseController` + DTOs + Mapper |
| WORK-06.8 | Exception handlers customizados |
| WORK-06.9 | Smoke test (Postman) com cenários: FIXED simples, INSTALLMENT 10x, cancelamento, update parcial |

---

## 12. Test plan
- **Unit:** `InstallmentServiceTest` (geração: 10x R$100 = 10 parcelas iguais; 7x R$100 = 6×R$14.29 + 1×R$14.26 ou similar — testar arredondamento). `ExpenseServiceTest` (create FIXED, create INSTALLMENT, cancel com mix de parcelas, update limitado).
- **Integração:** Testcontainers — fluxo completo create INSTALLMENT 10x, conferir 10 linhas em installments via SQL direto; cancelar e conferir status.
- **Manual:** Postman com cenários acima.

---

## 13. Open items
- **O-17:** Arredondamento de parcelas — última absorve diferença OU primeira? Recomendo **última** (convenção bancária BR).
- **O-18:** `purchase_date = 31/01` em INSTALLMENT 3x → due_dates: 28/02, 31/03, 30/04? Recomendo **fim do mês** quando o dia não existe (Java `YearMonth.of().atEndOfMonth()` quando aplicável). Documentar como decisão.
- **O-19:** Permitir `installmentsCount = 1` (= compra à vista parcelada uma vez)? Permitir — é INSTALLMENT 1x. UI pode esconder essa opção mas API aceita.
- **O-20:** Endpoint `PATCH /api/installments/{id}/pay` (marcar como paga)? Não escopo desta fase — fica para futuro junto com "adiantar parcela".

---

## Critério de "pronto"
```
[ ] POST INSTALLMENT 10x R$100 → expense criada + 10 installments com amounts somando R$1000 exato
[ ] POST FIXED R$50 → expense criada, 0 installments
[ ] POST com expenseType=INSTALLMENT sem installmentsCount → 422
[ ] POST /{id}/cancel → expense CANCELLED + parcelas PENDING viram CANCELLED, PAID ficam
[ ] GET com filtro ?year=2026&month=7 retorna FIXED ativas + installments com due_date em jul/2026
[ ] PUT muda só description/category/bank → ok; mudar totalAmount → ignorado ou 400
[ ] Testes passam
[ ] Diego aprova explicitamente
```
