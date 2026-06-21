# Spec WORK-07 — Dashboard (agregações)

> Fase 7. Endpoints de saldo do mês e despesas por categoria.

---

## Metadados
- **spec_id:** `WORK-07`
- **titulo_tecnico:** `GET /api/dashboard/balance` + `GET /api/dashboard/expenses-by-category`
- **source_product_spec:** `PLAN-01`
- **baseline:** pós-WORK-06
- **target_branch:** `feature/work-07-dashboard`
- **escopo_sistema:** `financial`
- **última_atualização:** 2026-05-31

---

## 1. Objective
Dois endpoints de agregação que alimentam a tela inicial do front: saldo do mês e despesas por categoria.

**Fora:** outras agregações (evolução anual, comparação entre meses, ranking de categorias por ano).

---

## 2. System overview
- **Atual:** WORK-06 entregou despesas + parcelas; WORK-05 entregou salário.
- **Alvo:** 2 endpoints com queries de agregação JPQL.

---

## 3. Architecture
`DashboardService` consulta queries dedicadas; **não** carrega entidades inteiras na memória.

---

## 4. Data design
Sem mudança de schema. Apenas leitura.

**Fórmula do saldo (já documentada em `01-database-modeling.md` §4):**
```
saldo_mes(year, month) =
    salario(year, month)
  - SUM(expense.total_amount WHERE expense_type=FIXED AND status=ACTIVE AND purchase_date <= último_dia(year, month))
  - SUM(installment.amount WHERE due_date BETWEEN primeiro_dia(year, month) AND último_dia(year, month) AND status IN (PENDING, PAID, ANTICIPATED))
```

**Agregação pizza:**
```
GROUP BY category_id sobre:
  - expenses FIXED ACTIVE com purchase_date <= último_dia(month)
  - installments com due_date no mês e status != CANCELLED
SUM(total_amount ou installment.amount)
```

---

## 5. Interface design

| Método | Path | Auth | Query | Response |
|---|---|---|---|---|
| GET | `/api/dashboard/balance` | JWT | `?year=2026&month=7` | `{salary: 5000.00, totalExpenses: 3200.00, balance: 1800.00, breakdown: {fixed: 1200.00, installments: 2000.00}}` |
| GET | `/api/dashboard/expenses-by-category` | JWT | `?year=2026&month=7` | `[{categoryId: "uuid", categoryName: "Alimentação", total: 800.00}, ...]` ordenado por total DESC |

Se `year`/`month` ausentes: usar ano/mês corrente.

---

## 6. Component design

- `DashboardService` — duas queries JPQL/native em `DashboardRepository` (interface custom).
- `DashboardController` — 2 endpoints.
- `BalanceResponse`, `CategoryExpenseResponse` (records).
- `DashboardRepository` (custom interface + impl) — para queries complexas com `EntityManager`.

---

## 7. UI
N/A (vem na WORK-09).

---

## 8. Runtime/ops
Sem mudanças.

---

## 9. Security
Igual: JWT obrigatório, filtra por user_id.

---

## 10. Requirement mapping
- **REQ-07** (Saldo) ✅
- **REQ-08** (Pizza despesas) ✅

---

## 11. Implementation plan input

| Sub-WORK | Objetivo |
|---|---|
| WORK-07.1 | Query JPQL para saldo (Salary + Expense FIXED + Installments) |
| WORK-07.2 | Query JPQL para agregação por categoria |
| WORK-07.3 | `DashboardService` + cálculos auxiliares (primeiro_dia, último_dia do mês) |
| WORK-07.4 | `DashboardController` + DTOs |
| WORK-07.5 | Postman + validação manual contra dados de teste |

---

## 12. Test plan
- **Unit:** `DashboardServiceTest` com mock de repositório.
- **Integração:** Testcontainers — popular dados conhecidos via SQL fixture, chamar endpoints, conferir totais exatos.
- **Manual:** Postman + planilha com cálculo manual.

---

## 13. Open items
- **O-21:** Endpoint deveria retornar também o "saldo acumulado" (saldo do mês + saldo do mês anterior)? Recomendo **não** nesta fase — escopo MVP é só saldo do mês.
- **O-22:** Cache da resposta? Recomendo **não** — agregação é rápida e dados mudam frequentemente.
- **O-23:** Casas decimais — usar `BigDecimal` no payload ou `double`? **`BigDecimal`** sempre para dinheiro (serializado como número JSON).

---

## Critério de "pronto"
```
[ ] GET /api/dashboard/balance?year=2026&month=7 retorna {salary, totalExpenses, balance, breakdown}
[ ] GET sem params usa ano/mês corrente
[ ] GET /api/dashboard/expenses-by-category retorna lista ordenada
[ ] Cálculo bate com fórmula documentada
[ ] Testes passam
[ ] Diego aprova explicitamente
```
