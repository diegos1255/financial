# Spec WORK-09 — Frontend: telas CRUD + dashboard

> Fase 9. Todas as telas funcionais.

---

## Metadados
- **spec_id:** `WORK-09`
- **titulo_tecnico:** Páginas React de Dashboard (com pizza), Categorias, Contas Bancárias, Salários, Despesas (com modal cancelar), Investimentos
- **source_product_spec:** `PLAN-01`
- **baseline:** pós-WORK-07 (back completo) + WORK-08 (front auth/layout).
- **target_branch:** `feature/work-09-front-pages`
- **escopo_sistema:** `financial-front`
- **última_atualização:** 2026-05-31

---

## 1. Objective
Implementar todas as 6 telas consumindo a API. Listagem (Table), formulário (Modal ou Page), ações (editar, cancelar despesa). Dashboard com KPI + gráfico pizza.

**Fora:** signup (WORK-11), responsividade mobile, animações avançadas.

---

## 2. System overview
- **Atual:** WORK-08 entregou layout + auth; placeholder em `/dashboard`.
- **Alvo:** 6 páginas funcionais.

---

## 3. Architecture
Mantém estrutura definida em WORK-08. Cada página em `pages/{Recurso}/`. Components reutilizáveis em `components/ui/`.

---

## 4. Data design
Sem persistência local além do necessário (estado de form em React state). Sem cache de listagens (sempre busca do back).

---

## 5. Interface design
Consome todos os endpoints `/api/categories`, `/api/bank-accounts`, `/api/salaries`, `/api/expenses`, `/api/investments`, `/api/dashboard/*`.

---

## 6. Component design

**Estrutura adicional:**
```
src/
├── pages/
│   ├── DashboardPage.tsx              ← KPI + pizza
│   ├── categories/
│   │   ├── CategoriesPage.tsx         ← lista + botão "Nova"
│   │   └── CategoryFormModal.tsx
│   ├── bank-accounts/
│   ├── salaries/
│   ├── expenses/
│   │   ├── ExpensesPage.tsx           ← lista com filtro mes/ano
│   │   ├── ExpenseFormModal.tsx       ← create/update (limita campos no update)
│   │   └── CancelExpenseModal.tsx     ← confirma cancelamento
│   └── investments/
├── components/ui/
│   ├── Table.tsx                      ← genérica
│   ├── Modal.tsx
│   ├── ConfirmModal.tsx
│   ├── KpiCard.tsx
│   └── PieChart.tsx                   ← wrapper Recharts
└── services/
    ├── categoryService.ts
    ├── bankAccountService.ts
    ├── salaryService.ts
    ├── expenseService.ts
    ├── investmentService.ts
    └── dashboardService.ts
```

**Componentes reutilizáveis:**
- `Table<T>` — colunas configuráveis, ações por linha (editar/cancelar/deletar).
- `Modal` — base.
- `KpiCard` — título + valor formatado + ícone.
- `PieChart` — wrapper Recharts com tooltip e legenda customizados.

---

## 7. UI (detalhamento por página)

**Dashboard:**
- 3 KPI Cards no topo: Salário do mês, Total de despesas do mês, Saldo (verde se positivo, vermelho se negativo).
- Filtro mês/ano (default: atual).
- Gráfico pizza "Despesas por categoria" abaixo.

**Categorias / Bank Accounts / Investments:**
- Tabela com colunas relevantes + botão "Novo" no topo.
- Linha: editar (modal), deletar (confirma → soft-delete).

**Salários:**
- Tabela ordenada por ano/mês DESC.
- Form: bankAccountId (select), referenceYear/referenceMonth, amount, description.
- Conflito 409 → mensagem específica no form.

**Despesas:**
- Tabela com filtro mês/ano.
- Form de criação: type FIXED ou INSTALLMENT, campos condicionais.
- Coluna "Ações": editar (limited fields), cancelar (modal confirma).

---

## 8. Runtime/ops
Sem mudanças além do consumo dos endpoints.

---

## 9. Security
Mantém política — todas as páginas dentro de `ProtectedLayout`. Erros 4xx mostram mensagem amigável; 5xx mostram "Erro inesperado, tente novamente".

---

## 10. Requirement mapping
- **REQ-02** (front) ✅
- **REQ-03** (front) ✅
- **REQ-04** (front, parte principal) ✅
- **REQ-05** (front) ✅
- **REQ-06** (front) ✅
- **REQ-07** (Dashboard) ✅
- **REQ-08** (Pizza) ✅

---

## 11. Implementation plan input

| Sub-WORK | Objetivo |
|---|---|
| WORK-09.1 | Componentes ui reutilizáveis (Table, Modal, KpiCard) |
| WORK-09.2 | `services/*` axios wrappers para cada endpoint |
| WORK-09.3 | Dashboard (KPI + pizza com Recharts) |
| WORK-09.4 | Categories (CRUD UI) |
| WORK-09.5 | BankAccounts (CRUD UI) |
| WORK-09.6 | Investments (CRUD UI) |
| WORK-09.7 | Salaries (CRUD UI com regra de competência) |
| WORK-09.8 | Expenses (CRUD UI + form condicional + modal cancelar) |
| WORK-09.9 | Smoke E2E manual (cada fluxo) |

---

## 12. Test plan
Manual end-to-end por feature.

---

## 13. Open items
- **O-27:** Toast library — `react-hot-toast` ou similar? **Sim** — mensagens de sucesso/erro padronizadas. Adicionar.
- **O-28:** Formatação de moeda — `Intl.NumberFormat('pt-BR', {currency:'BRL'})` em utilitário compartilhado. **Sim**.
- **O-29:** Datas via `date-fns` ou `dayjs`? **`date-fns`** (tree-shakeable, padrão moderno).

---

## Critério de "pronto"
```
[ ] Dashboard mostra KPIs e pizza com dados reais
[ ] Cada CRUD: criar, listar, editar, deletar (ou cancelar) funcionando
[ ] Cancelar despesa parcelada: backend confirma cascata, front recarrega lista
[ ] Validações de form mostram mensagens claras
[ ] Conflito (Salary duplicado) mostra mensagem específica
[ ] Diego aprova explicitamente
```
