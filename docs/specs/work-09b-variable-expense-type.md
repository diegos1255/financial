# Spec — Tipo de Despesa Variável (VARIABLE)

## Metadados

- **spec_id:** `WORK-09B`
- **titulo_tecnico:** Adicionar tipo `VARIABLE` ao `ExpenseType` — backend enum + service + frontend form/badge
- **source_product_spec:** Feedback de smoke test da WORK-09 (2026-06-09) — Diego identificou ausência de tipo para gastos pontuais não recorrentes (ex: mercado, gasolina)
- **source_product_spec_version:** v1 — 2026-06-09
- **baseline_branch_or_commit:** estado atual pós-WORK-09 (sem git)
- **target_branch:** main
- **escopo_sistema:** `financial` (backend Spring Boot) + `financial-front` (SPA React)
- **última_atualização:** 2026-06-09

---

## 1. Objective do documento

**O que esta spec permite que engenharia faça:**
Implementar o tipo `VARIABLE` de despesa, permitindo registrar gastos pontuais não recorrentes (ida ao mercado, abastecimento, consulta médica, etc.) distintos de FIXED (mensalidade recorrente) e INSTALLMENT (compra parcelada).

**O que esta spec não cobre:**
- Relatórios ou agrupamentos por tipo de despesa no dashboard.
- Recorrência automática de qualquer tipo de despesa.
- Alteração do tipo de uma despesa já cadastrada (continua sendo: cancelar + recriar).

**Artefatos complementares:**
- `docs/01-database-modeling.md` — enum `expense_type` no schema.
- `docs/specs/work-06-expenses-installments.md` — lógica original de FIXED/INSTALLMENT.

---

## 2. System overview

**Estado atual:**
- `ExpenseType` tem dois valores: `FIXED` e `INSTALLMENT`.
- `FIXED`: despesa mensal recorrente (ex: Netflix). Não gera installments. O usuário a insere uma vez por mês.
- `INSTALLMENT`: compra parcelada. Gera N registros na tabela `installments` com `due_date` espaçado mensalmente.
- Não existe forma de registrar um gasto pontual não recorrente sem usar indevidamente `FIXED`.

**Estado alvo:**
- Novo valor `VARIABLE` no enum `ExpenseType`.
- Comportamento idêntico a `FIXED` em termos de geração de dados (sem installments, sem cascata no cancel), porém com semântica distinta: gasto único, não recorrente.
- Frontend exibe a nova opção no form de criação e um badge diferenciado na listagem.

**Delta técnico:**
- Backend: 1 linha no enum + 1 cláusula no service.
- Frontend: 1 tipo TS + 1 option no select + 1 badge na tabela.

**Escopo explícito:**
- Cadastro de despesa com tipo VARIABLE.
- Exibição de badge "Variável" na listagem de despesas.
- Cancel de despesa VARIABLE (sem cascata — não há installments).

**Fora de escopo:**
- Migração de expenses FIXED existentes para VARIABLE.
- Filtro por tipo na listagem (o select de status já existe; tipo pode ser filtro futuro — WORK-13).

**Restrições obrigatórias:**
- `ddl-auto=update` cuida do enum no Postgres. Sem migration manual.
- Soft-delete sempre — VARIABLE cancelada vira `status=CANCELLED`, nunca DELETE físico.
- Regras de negócio no backend; frontend só renderiza.

---

## 3. Architecture design

**Arquitetura atual relevante:**
```
ExpenseController → ExpenseService → ExpenseRepository
                         ↓
                   InstallmentService (só pra INSTALLMENT)
```

**Arquitetura alvo:** idêntica. VARIABLE segue o mesmo caminho de FIXED — `InstallmentService` não é invocado.

**Principais componentes impactados:**
- `ExpenseType.java` (enum) — adiciona `VARIABLE`
- `ExpenseService.java` — condição existente `if INSTALLMENT → gerar parcelas` já exclui FIXED e excluirá VARIABLE sem mudança; apenas garantir que validação de `installmentsCount` não exige o campo para VARIABLE
- `expense.ts` (TypeScript type) — adiciona `'VARIABLE'`
- `ExpenseFormModal.tsx` — nova option + label condicional
- `ExpensesPage.tsx` — novo badge

**Trade-offs:**
- Hibernate `ddl-auto=update` com enum no Postgres: ao adicionar valor ao enum Java, Hibernate **não altera** CHECK constraints de enum no Postgres automaticamente em todas as versões. Solução: usar `@Enumerated(EnumType.STRING)` (já adotado no projeto — armazena como VARCHAR, sem CHECK constraint de enum nativo). Portanto, nenhuma ação extra de schema é necessária.

---

## 4. Data design

**Entidade impactada:** `Expense` (tabela `expenses`, coluna `expense_type VARCHAR`).

**Mudança:** adicionar o literal `'VARIABLE'` como valor aceito. Como a coluna usa `VARCHAR` + `@Enumerated(STRING)`, o Hibernate aceita o novo valor sem DDL adicional.

**Regras de validação:**
| Campo | FIXED | INSTALLMENT | VARIABLE |
|---|---|---|---|
| `installmentsCount` | null (ignorado) | obrigatório ≥ 1 | null (ignorado) |
| `totalAmount` | obrigatório ≥ 0 | obrigatório ≥ 0 | obrigatório ≥ 0 |
| `purchaseDate` | obrigatório | obrigatório | obrigatório |

**Cancel:**
- VARIABLE: marca `expense.status = CANCELLED`. Nenhuma parcela existe → sem cascata.

**Compatibilidade retroativa:** total. Expenses FIXED e INSTALLMENT existentes não são afetadas.

---

## 5. Interface design

**Endpoint impactado:** `POST /api/expenses` e `PUT /api/expenses/{id}` (sem mudança de contrato — `expenseType` já é um campo string; o backend passa a aceitar `"VARIABLE"` além de `"FIXED"` e `"INSTALLMENT"`).

**Validação server-side (ExpenseService):**
```java
// Lógica existente (pseudocódigo):
if (request.expenseType() == INSTALLMENT) {
    validateInstallmentsCount(request.installmentsCount()); // obrigatório
    installmentService.generate(expense, request.installmentsCount());
}
// FIXED e VARIABLE: nenhuma ação extra — já funciona assim
```
A validação atual rejeita `installmentsCount` obrigatório apenas para INSTALLMENT. VARIABLE se encaixa naturalmente no else (sem geração de parcelas).

**Resposta:** `ExpenseResponse` retorna `expenseType: "VARIABLE"` — sem mudança de DTO.

**Erros esperados:**
- `VARIABLE` com `installmentsCount` não-nulo → ignorar (ou retornar 422 `VARIABLE_CANNOT_HAVE_INSTALLMENTS` — ver Open Items).

---

## 6. Component design

### Backend — `ExpenseType.java`
```java
public enum ExpenseType {
    FIXED,
    INSTALLMENT,
    VARIABLE   // ← novo
}
```

### Backend — `ExpenseService.java`
Verificar se a validação de `installmentsCount` está acoplada ao tipo. A lógica atual deve ser:
```java
if (request.expenseType() == ExpenseType.INSTALLMENT) {
    if (request.installmentsCount() == null || request.installmentsCount() < 1)
        throw new ValidationException("installmentsCount obrigatório para INSTALLMENT");
    installmentService.generate(saved, request.installmentsCount());
}
```
VARIABLE entra no `else` implícito → zero mudança na lógica de geração. Confirmar na implementação lendo o service atual.

### Frontend — `types/expense.ts`
```ts
export type ExpenseType = 'FIXED' | 'INSTALLMENT' | 'VARIABLE';
```

### Frontend — `ExpenseFormModal.tsx`
Select de tipo:
```tsx
<option value="FIXED">Fixa (mensalidade)</option>
<option value="INSTALLMENT">Parcelada</option>
<option value="VARIABLE">Variável (pontual)</option>
```
Label do campo valor:
```tsx
label={
  expenseType === 'INSTALLMENT' ? 'Total (R$)' :
  expenseType === 'FIXED'       ? 'Valor mensal (R$)' :
                                  'Valor (R$)'
}
```
Campo `installmentsCount`: permanece visível **apenas** quando `expenseType === 'INSTALLMENT'` (sem mudança).

### Frontend — `ExpensesPage.tsx`
Badge para VARIABLE:
```tsx
r.expenseType === 'VARIABLE'
  ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">Variável</span>
  : // existing FIXED/INSTALLMENT badges
```

---

## 7. UI and interaction design

**Telas alteradas:**
- **Despesas → Nova despesa**: select de tipo ganha terceira opção "Variável (pontual)". Ao selecionar, campo de parcelas some (igual a FIXED). Label do valor muda para "Valor (R$)".
- **Despesas → listagem**: badge âmbar "Variável" para expenses do tipo VARIABLE.

**Estados visuais:**
- Badge FIXED: cinza (`bg-slate-100 text-slate-700`) — mantido.
- Badge INSTALLMENT: índigo com `N×` — mantido.
- Badge VARIABLE: âmbar (`bg-amber-50 text-amber-700`) — novo.

**Cancelar VARIABLE:** modal de confirmação existente (`ConfirmModal`) não menciona parcelas (condicional `expenseType === 'INSTALLMENT'` já presente no `ExpensesPage.tsx`). Nenhuma mudança necessária.

---

## 8. Runtime and operations

Sem impacto. Nenhuma migração, nenhuma config nova, nenhum serviço adicional.

---

## 9. Security, privacy and compliance

Sem impacto. `user_id` continua isolando todas as queries. Soft-delete mantido.

---

## 10. Requirement mapping

**REQ-04 (atualizado):** "Cadastro de despesas... fixa ou parcelada" → estendido para "fixa, parcelada **ou variável**".

---

## 11. Implementation plan

### Checklist de implementação

**Backend (`D:\workspace\financial`):**
- [ ] `src/main/java/.../model/enums/ExpenseType.java` — adicionar `VARIABLE`
- [ ] `src/main/java/.../service/ExpenseService.java` — confirmar que VARIABLE não entra na branch de geração de installments (leitura + ajuste se necessário)

**Frontend (`D:\workspace\financial-front`):**
- [ ] `src/types/expense.ts` — adicionar `'VARIABLE'` ao union type
- [ ] `src/pages/expenses/ExpenseFormModal.tsx` — nova option + label condicional
- [ ] `src/pages/expenses/ExpensesPage.tsx` — badge âmbar para VARIABLE

**Validação:**
- [ ] `npx tsc --noEmit` — zero erros
- [ ] Criar despesa VARIABLE no browser → aparece badge "Variável" na listagem
- [ ] Cancelar despesa VARIABLE → modal sem menção a parcelas; expense fica CANCELLED

---

## 12. Test plan

**Manual (smoke):**
1. Criar despesa VARIABLE com valor R$ 150,00 (mercado) → badge "Variável" âmbar na listagem.
2. Criar despesa VARIABLE → campo parcelas **não aparece**.
3. Cancelar despesa VARIABLE → modal não menciona cascata → expense = CANCELLED.
4. Dashboard do mês: saldo diminui pelo valor da VARIABLE (mesma lógica de FIXED).
5. Regressão: FIXED e INSTALLMENT continuam funcionando normalmente.

---

## 13. Open items

| # | Item | Decisão |
|---|---|---|
| O-01 | Enviar `installmentsCount` não-nulo com tipo VARIABLE: ignorar silenciosamente ou retornar 422? | Ignorar silenciosamente (frontend nunca envia; backend descarta). Sem validação extra por ora. |
| O-02 | Filtro por tipo na listagem de despesas | Fora de escopo desta spec — backlog WORK-13. |
