# Spec WORK-05 — Salário (CRUD com regra de competência)

> Fase 5. CRUD de `Salary` com unicidade por (user, ano, mês).

---

## Metadados
- **spec_id:** `WORK-05`
- **titulo_tecnico:** CRUD de `Salary` por competência com UNIQUE(user_id, reference_year, reference_month) e validações de competência
- **source_product_spec:** `PLAN-01`
- **baseline:** pós-WORK-04
- **target_branch:** `feature/work-05-salary`
- **escopo_sistema:** `financial`
- **última_atualização:** 2026-05-31

---

## 1. Objective
CRUD completo de salário por competência, atrelado a uma `BankAccount`. Garantir UNIQUE(user, ano, mês) — tentativa de duplicar competência retorna 409.

**Fora:** despesas, dashboard.

---

## 2. System overview
- **Atual:** WORK-04 entregou CRUDs simples + BankAccount.
- **Alvo:** 5 endpoints `/api/salaries`, com regras de unicidade e validação de competência.
- **Restrições:** referenciado por (`reference_year`, `reference_month`), não por `Date`.

---

## 3. Architecture
Mesma estrutura dos CRUDs (Controller/Service/Repository/DTOs/Mapper). Diferença: regra de negócio de unicidade no service.

---

## 4. Data design
- Tabela `salaries` já criada na WORK-02 com `UNIQUE(user_id, reference_year, reference_month)`.
- Service captura `DataIntegrityViolationException` ou checa explicitamente antes do insert e lança `DuplicateSalaryException` que vira 409.

---

## 5. Interface design

| Método | Path | Auth | Comportamento |
|---|---|---|---|
| GET | `/api/salaries` | JWT | Lista do user, ordenada por (ano DESC, mês DESC). Query: `?year=`, `?month=`, `?bankAccountId=`. |
| GET | `/api/salaries/{id}` | JWT | Get individual. |
| POST | `/api/salaries` | JWT | `{bankAccountId, referenceYear, referenceMonth, amount, description}`. **409** se competência já existe. |
| PUT | `/api/salaries/{id}` | JWT | Atualiza. **409** se a nova competência colidir com outra existente. |
| DELETE | `/api/salaries/{id}` | JWT | **Hard delete** aqui (não tem campo `active` em Salary; remoção real para reabrir a competência). 204. |

> Nota sobre delete em Salary: única exceção à regra geral de soft-delete. Justificativa: Salary é "evento histórico" — se foi cadastrado errado, faz mais sentido apagar e recadastrar do que carregar lixo. Diego confirmar (O-15).

**Validações:**
- `referenceYear` entre 2000 e 2100.
- `referenceMonth` entre 1 e 12.
- `amount >= 0`.
- `bankAccountId` deve existir e pertencer ao user logado.

---

## 6. Component design

- `SalaryRepository` — `findByUserIdAndYearAndMonth(UUID, int, int)`, `findByUserId(UUID)`.
- `SalaryService` — `create`, `update`, `delete`, `list(filters)`, `get`. Inclui checagem de unicidade.
- `SalaryController` — 5 endpoints REST.
- `SalaryRequest` (record) — com `@Min/@Max` para year/month, `@Positive` para amount.
- `SalaryResponse` (record).
- `SalaryMapper`.
- `DuplicateSalaryException` (no package `exception/`) — traduzida pelo `ApiErrorHandler` para 409 `DUPLICATE_SALARY`.

---

## 7. UI
N/A (vem na WORK-09).

---

## 8. Runtime/ops
Sem novas env vars ou config.

---

## 9. Security
Igual aos demais CRUDs: isolamento por user, JWT obrigatório.

---

## 10. Requirement mapping
- **REQ-03** ✅.

---

## 11. Implementation plan input

| Sub-WORK | Objetivo |
|---|---|
| WORK-05.1 | Repository + queries customizadas |
| WORK-05.2 | Service com regra de unicidade |
| WORK-05.3 | Controller + DTOs + Mapper |
| WORK-05.4 | `DuplicateSalaryException` + handler |
| WORK-05.5 | Smoke test (Postman) |

---

## 12. Test plan
- **Unit:** `SalaryServiceTest` — cobre cenários OK, duplicado no create, duplicado no update (mudando competência).
- **Integração:** Testcontainers + cenário completo create → list → update → conflict → delete.

---

## 13. Open items
- **O-15:** Delete físico em Salary é OK? Alternativa: soft-delete via campo extra `active` (mas o UNIQUE constraint passa a ser parcial — complica). **Recomendo hard delete** por simplicidade.
- **O-16:** Suporte para "copiar salário do mês anterior" como atalho? Recomendo **não** — UI pode oferecer isso preenchendo o form com último valor; backend não precisa de endpoint próprio.

---

## Critério de "pronto"
```
[ ] CRUD Salary funcional
[ ] POST duplicado → 409 DUPLICATE_SALARY
[ ] PUT com competência colidindo → 409
[ ] BankAccount de outro user → 404
[ ] Testes passam
[ ] Diego aprova explicitamente
```
