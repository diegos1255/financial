# Spec — Dashboard com VARIABLE + Visibilidade de INSTALLMENT no mês de compra

## Metadados

- **spec_id:** `WORK-09C`
- **titulo_tecnico:** Incluir despesas VARIABLE no dashboard (saldo + pizza) e exibir INSTALLMENT na listagem do mês de compra (não só meses com parcelas vencendo)
- **source_product_spec:** Feedback do smoke test da WORK-09 + WORK-09B (2026-06-09) — Diego identificou que o dashboard ignora VARIABLE e que INSTALLMENT comprada no mês corrente não aparece na listagem porque a primeira parcela cai no mês seguinte
- **source_product_spec_version:** v1 — 2026-06-09
- **baseline_branch_or_commit:** estado pós-WORK-09B (VARIABLE no enum + frontend + constraint do banco corrigido)
- **target_branch:** main
- **escopo_sistema:** `financial` (backend) + `financial-front` (SPA)
- **última_atualização:** 2026-06-09

---

## 1. Objective do documento

**O que esta spec permite:**
1. Que VARIABLE seja contabilizada nos endpoints do dashboard (`/balance` e `/expenses-by-category`).
2. Que INSTALLMENT comprada no mês N apareça na listagem de despesas do mês N (atualmente só aparece a partir do mês N+1, quando a primeira parcela vence).

**O que esta spec não cobre:**
- Mudança na lógica de geração de parcelas (`InstallmentService.generateForExpense` continua usando `purchase_date + n` com n=1).
- Adição de filtro por tipo na listagem (backlog WORK-13).
- Recálculo retroativo de installments existentes.

**Artefatos complementares:**
- `docs/specs/work-07-dashboard.md` — spec original do dashboard.
- `docs/specs/work-09b-variable-expense-type.md` — introdução do tipo VARIABLE.

---

## 2. System overview

**Estado atual (pós-WORK-09B):**

| Operação | FIXED | INSTALLMENT | VARIABLE |
|---|---|---|---|
| Listagem `/api/expenses?year=&month=` | ✅ aparece se `purchase_date ≤ fim_mês` | ⚠️ só aparece em meses com parcela vencendo | ✅ aparece no mês de compra (WORK-09B) |
| Dashboard `/balance` (saldo do mês) | ✅ soma `totalAmount` se ativa até fim do mês | ✅ soma parcelas vencendo no mês | ❌ **não soma** |
| Dashboard `/expenses-by-category` | ✅ agrupa por categoria | ✅ agrupa via tabela installments | ❌ **não considera** |

**Estado alvo:**

| Operação | FIXED | INSTALLMENT | VARIABLE |
|---|---|---|---|
| Listagem | (sem mudança) | ✅ aparece em meses com parcela **OU** no mês de compra | (sem mudança) |
| Dashboard `/balance` | (sem mudança) | (sem mudança) | ✅ soma `totalAmount` se comprada no mês |
| Dashboard `/expenses-by-category` | (sem mudança) | (sem mudança) | ✅ agrupa por categoria, valor = `totalAmount` |

**Delta técnico:**
- Backend: 1 nova condição no `ExpenseSpecifications.inReferenceMonth`; 2 novos métodos no `DashboardRepository`; ajuste em 2 métodos do `DashboardService`; novo campo no DTO `BalanceBreakdown`.
- Frontend: 1 campo novo em `dashboard.ts`; ajuste no subtitle do KPI "Despesas" no `DashboardPage.tsx`.

**Escopo explícito:**
- Inclusão de VARIABLE no saldo e na pizza do dashboard.
- Inclusão da regra "INSTALLMENT no mês de compra" na listagem.

**Fora de escopo:**
- Mudar a semântica do total no dashboard (continua representando "o que estou pagando neste mês", não "o que comprei neste mês"). Para INSTALLMENT, ainda soma só as **parcelas vencendo** — não soma o total no mês de compra (evita contagem dupla).

**Restrições obrigatórias:**
- Soft-delete mantido — VARIABLE/INSTALLMENT canceladas não aparecem no dashboard nem na listagem ativa.
- `user_id` continua isolando todas as queries.
- Sem mudança de schema.

---

## 3. Architecture design

**Arquitetura atual relevante:** sem mudança estrutural. As correções acontecem nos componentes existentes:
```
ExpenseController → ExpenseService → ExpenseSpecifications.inReferenceMonth (← alteração)
DashboardController → DashboardService → DashboardRepository (← adição de métodos)
```

**Trade-offs:**
- Para a listagem, INSTALLMENT vai aparecer em **2 contextos diferentes**: no mês de compra (com o valor `totalAmount`) e no mês de cada parcela. A linha exibida na tabela vai mostrar `totalAmount` em ambos os casos — pode confundir o usuário. Mitigação aceita: front continua mostrando `totalAmount` na coluna "Total" (não é problema desta spec).
- Para o dashboard, ao adicionar VARIABLE, evitamos contagem dupla com INSTALLMENT porque VARIABLE não tem registros em `installments`. Sem risco de overlap.

---

## 4. Data design

**Nenhuma mudança de schema, entidade ou DTO de domínio.**

**DTO `BalanceBreakdown` (DTO interno do dashboard):**
- Atual: `{ fixed: BigDecimal, installments: BigDecimal }`
- Novo: `{ fixed: BigDecimal, installments: BigDecimal, variable: BigDecimal }`

**Compatibilidade do contrato:** consumidores do `/api/dashboard/balance` continuam recebendo `salary`, `totalExpenses` e `balance` corretos. Quem lê `breakdown.variable` (novo) é só o front próprio.

---

## 5. Interface design

**Endpoints impactados (sem mudança de contrato externo, exceto adição de `variable` no breakdown):**

### `GET /api/dashboard/balance?year=&month=`
**Resposta atual:**
```json
{
  "year": 2026,
  "month": 6,
  "salary": 5000.00,
  "totalExpenses": 50.00,
  "balance": 4950.00,
  "breakdown": { "fixed": 50.00, "installments": 0.00 }
}
```
**Resposta nova:**
```json
{
  "year": 2026,
  "month": 6,
  "salary": 5000.00,
  "totalExpenses": 173.00,
  "balance": 4827.00,
  "breakdown": { "fixed": 50.00, "installments": 0.00, "variable": 123.00 }
}
```
`totalExpenses` agora é `fixed + installments + variable`.

### `GET /api/dashboard/expenses-by-category?year=&month=`
**Sem mudança de contrato.** Apenas passa a incluir VARIABLE na agregação por categoria.

### `GET /api/expenses?year=&month=`
**Sem mudança de contrato.** Passa a retornar também INSTALLMENT com `purchase_date` no intervalo do mês, mesmo sem parcela vencendo.

---

## 6. Component design

### Backend — `ExpenseSpecifications.java`
Adicionar terceiro predicado no `inReferenceMonth`:
```java
Predicate installmentPurchaseInMonth = cb.and(
    cb.equal(root.get("expenseType"), ExpenseType.INSTALLMENT),
    cb.between(root.<LocalDate>get("purchaseDate"), startOfMonth, endOfMonth)
);
return cb.or(fixedActive, cb.exists(sub), variableInMonth, installmentPurchaseInMonth);
```
**Cuidado:** INSTALLMENT comprada no mês N continua aparecendo no mês N+1 (via subquery `cb.exists(sub)` — quando primeira parcela vence). O OR garante que ambas as condições sejam atendidas sem duplicar a linha (uma única expense satisfaz uma OU outra).

### Backend — `DashboardRepository.java`
Adicionar 2 novos métodos análogos aos de FIXED:
```java
public BigDecimal sumVariableExpenses(UUID userId, LocalDate startOfMonth, LocalDate endOfMonth) {
    // SELECT COALESCE(SUM(e.totalAmount), 0) FROM Expense e
    //  WHERE e.user.id = :userId
    //    AND e.expenseType = VARIABLE
    //    AND e.status = ACTIVE
    //    AND e.purchaseDate BETWEEN :startOfMonth AND :endOfMonth
}

public List<Tuple> sumVariableExpensesByCategory(UUID userId, LocalDate startOfMonth, LocalDate endOfMonth) {
    // SELECT e.category.id AS categoryId, e.category.name AS categoryName,
    //        COALESCE(SUM(e.totalAmount), 0) AS total
    //   FROM Expense e
    //  WHERE e.user.id = :userId
    //    AND e.expenseType = VARIABLE
    //    AND e.status = ACTIVE
    //    AND e.purchaseDate BETWEEN :startOfMonth AND :endOfMonth
    //  GROUP BY e.category.id, e.category.name
}
```

### Backend — `BalanceBreakdown.java` (DTO record)
Adicionar parâmetro `variable`:
```java
public record BalanceBreakdown(BigDecimal fixed, BigDecimal installments, BigDecimal variable) {}
```

### Backend — `DashboardService.java`
**`balance()`:**
```java
BigDecimal fixed = repository.sumFixedExpenses(userId, endOfMonth);
BigDecimal installments = repository.sumInstallments(userId, startOfMonth, endOfMonth);
BigDecimal variable = repository.sumVariableExpenses(userId, startOfMonth, endOfMonth);
BigDecimal totalExpenses = fixed.add(installments).add(variable);
BigDecimal balance = salary.subtract(totalExpenses);

return new BalanceResponse(
    ym.getYear(), ym.getMonthValue(),
    salary, totalExpenses, balance,
    new BalanceBreakdown(fixed, installments, variable)
);
```

**`expensesByCategory()`:**
```java
Map<UUID, CategoryExpenseResponse> merged = new LinkedHashMap<>();
accumulate(merged, repository.sumFixedExpensesByCategory(userId, endOfMonth));
accumulate(merged, repository.sumInstallmentsByCategory(userId, startOfMonth, endOfMonth));
accumulate(merged, repository.sumVariableExpensesByCategory(userId, startOfMonth, endOfMonth));
```

### Frontend — `types/dashboard.ts`
```ts
export type BalanceBreakdown = {
  fixed: number;
  installments: number;
  variable: number;  // ← novo
};
```

### Frontend — `pages/DashboardPage.tsx`
Subtitle do KPI "Total Despesas" agora mostra 3 valores:
```tsx
subtitle={`Fixas ${formatCurrency(balance.breakdown.fixed)} · Parcelas ${formatCurrency(balance.breakdown.installments)} · Variáveis ${formatCurrency(balance.breakdown.variable)}`}
```

---

## 7. UI and interaction design

**Dashboard:**
- KPI "Total Despesas" passa a refletir o impacto real do mês (Fixas + Parcelas vencendo + Variáveis pontuais).
- Subtitle do KPI mostra o breakdown completo dos 3 tipos.
- PieChart de "Despesas por Categoria" passa a incluir as categorias das despesas variáveis do mês.

**Listagem de despesas:**
- Filtrando "Junho/2026", uma despesa INSTALLMENT comprada em 15/Jun/2026 com parcelas começando em Julho **passa a aparecer** na listagem de Junho.
- A coluna "Total" mostra `totalAmount` (comportamento já existente).
- O badge mantém `Nx` (n = `installmentsCount`).
- Não há mudança visual no front da página de despesas (só a query muda).

---

## 8. Runtime and operations

Sem impacto. Nenhuma config nova, nenhum serviço adicional, nenhuma migration.

---

## 9. Security, privacy and compliance

Sem impacto. Filtros por `user.id` mantidos. Soft-delete mantido.

---

## 10. Requirement mapping

- **REQ-07 (Dashboard saldo):** ajuste para incluir VARIABLE no cálculo. Comportamento alvo do requisito original ("salário - total de contas") agora abrange os 3 tipos de despesa.
- **REQ-08 (Pizza de despesas):** ajuste para incluir VARIABLE na agregação por categoria.
- **REQ-04 (Despesas):** ajuste de visibilidade — INSTALLMENT no mês de compra fica visível na listagem.

---

## 11. Implementation plan

### Checklist

**Backend (`D:\workspace\financial`):**
- [ ] `dto/BalanceBreakdown.java` — adicionar campo `variable`
- [ ] `repository/DashboardRepository.java` — adicionar `sumVariableExpenses` e `sumVariableExpensesByCategory`
- [ ] `service/DashboardService.java` — somar VARIABLE no balance e expensesByCategory
- [ ] `repository/ExpenseSpecifications.java` — adicionar predicado `installmentPurchaseInMonth`

**Frontend (`D:\workspace\financial-front`):**
- [ ] `types/dashboard.ts` — adicionar `variable: number` em `BalanceBreakdown`
- [ ] `pages/DashboardPage.tsx` — subtitle do KPI inclui variáveis

**Validação:**
- [ ] `mvnw clean compile` — backend sem erros
- [ ] `npx tsc --noEmit` — frontend sem erros
- [ ] Smoke: dashboard mostra `Despesa Teste VARIABLE 123,00` no total; pizza mostra a categoria correspondente; listagem em Junho/2026 mostra Bicicleta, Notebook, Curso, Despesa Teste installment

---

## 12. Test plan

**Manual (smoke test pós-implementação):**

1. **Listagem** — filtro `Junho/2026 + ACTIVE`:
   - Esperado: Netflix premium (FIXED) + Despesa Teste VARIABLE + Bicicleta + Notebook + Curso + Despesa Teste installment.
   - Não deve aparecer: Test31 (já paga, sem parcela em Junho, comprada em Janeiro).

2. **Listagem** — filtro `Julho/2026 + ACTIVE`:
   - Esperado: Netflix premium (FIXED), Bicicleta, Notebook, Curso, Despesa Teste installment (todas com primeira parcela em Julho).
   - Não deve aparecer: VARIABLE de Junho.

3. **Dashboard** — `Junho/2026`:
   - Salário do mês.
   - Total despesas = Netflix (50) + VARIABLE (123) = **173,00**.
   - Breakdown: `Fixas R$ 50 · Parcelas R$ 0 · Variáveis R$ 123`.
   - Pizza: 2 fatias (categoria do Netflix + categoria da Despesa Teste VARIABLE).

4. **Dashboard** — `Julho/2026`:
   - Total despesas = Netflix (50) + parcelas de Julho (Bicicleta 1ª + Notebook 1ª + Curso 1ª + Despesa Teste installment 1ª).
   - VARIABLE de Junho **não conta** em Julho.

5. **Regressão:**
   - Cancelar uma despesa INSTALLMENT → some da listagem e do dashboard imediatamente.
   - Cancelar uma VARIABLE → mesma coisa.

---

## 13. Open items

| # | Item | Decisão |
|---|---|---|
| O-01 | Confusão potencial: usuário vê uma INSTALLMENT no mês de compra (R$1000) e também nos meses de parcela (R$100/mês). | **Revertido em 2026-06-09 após smoke test:** Diego identificou que mostrar INSTALLMENT no mês de compra confunde a semântica "o que vou pagar este mês". A semântica correta é só meses com parcela vencendo. Predicado `installmentPurchaseInMonth` removido do `ExpenseSpecifications`. |
| O-02 | Total no dashboard para INSTALLMENT continua sendo a parcela do mês, não o `totalAmount`. Isso é deliberado: "o que estou pagando neste mês". | Decisão fechada. Sem mudança. |

---

## Apêndice — Decisão revisada (2026-06-09)

A regra final de visibilidade na listagem de despesas é:

| Tipo | Aparece no filtro do mês quando |
|---|---|
| FIXED | `purchase_date ≤ fim_do_mês` (já estava assim — pago todo mês) |
| INSTALLMENT | tem parcela com `due_date` no mês (regra original — só meses que vou pagar) |
| VARIABLE | foi comprada no mês (`purchase_date BETWEEN start AND end`) |

INSTALLMENT comprada hoje (Jun) com primeira parcela em Julho:
- Junho: **não aparece** (não pago nada)
- Julho/Agosto/...: aparece nos meses de cada parcela
