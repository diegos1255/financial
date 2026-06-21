# Spec WORK-16 — Dashboard enrichments (portfólio + pizza interativa + UI polish)

> **Status:** aprovada para implementação em 2026-06-12. Depende de WORK-15 (cotações Redis/Brapi).

---

## Metadados
- **spec_id:** `WORK-16`
- **titulo_tecnico:** Dashboard — bloco de portfólio de investimentos + drill-down na pizza de despesas + fix alinhamento de colunas
- **baseline:** pós-WORK-15 (cotações de mercado funcionando)
- **target_branch:** `feature/work-16-dashboard-enrichments`
- **escopo_sistema:** `financial-front` (front, majoritariamente) + `financial` (back, 1 endpoint novo)
- **última_atualização:** 2026-06-12

---

## 1. Objective

Três melhorias no dashboard e na UI geral:

1. **Bloco de portfólio:** exibir valor total de mercado dos investimentos do usuário no dashboard, com valor por ticker e variação do dia.
2. **Pizza interativa:** clicar em uma fatia do donut de despesas abre uma modal com a lista de despesas daquela categoria no mês selecionado (descrição, data, valor).
3. **Fix de alinhamento:** colunas da tabela de despesas (`ExpensesPage`) mal-alinhadas em relação ao cabeçalho — centralizar conforme o `header` de cada coluna.

**Fora de escopo:** gráfico de evolução histórica do portfólio, comparação com benchmarks (IBOVESPA), edição de despesas a partir da modal de drill-down.

---

## 2. System overview

**Estado atual:**
- Dashboard tem: saldo do mês (KPIs), donut de despesas por categoria. Sem bloco de investimentos.
- Pizza: apenas visual, sem interação ao clicar.
- Tabela de despesas: colunas com alinhamento inconsistente (conteúdo não alinhado ao `header`).

**Estado alvo:**
- Dashboard ganha um card "Portfólio" abaixo dos KPIs, listando os investimentos com cotação atual.
- Clicar em uma fatia do donut abre `CategoryExpensesModal` com as despesas daquela categoria no mês.
- Tabela de despesas com alinhamento correto em todas as colunas.

---

## 3. Architecture design

```
Dashboard
  ├── KPIs (existente)
  ├── DonutChart (existente + onClick novo)
  │     └── CategoryExpensesModal (novo)
  │           └── GET /api/expenses?categoryId=&year=&month=&size=50
  └── PortfolioCard (novo)
        └── GET /api/investments/portfolio  ← já existe (WORK-15)
```

O backend da pizza usa o endpoint de despesas **já existente** com filtros `categoryId + year + month`. Sem endpoint novo.

O backend do portfólio usa o endpoint `GET /api/investments/portfolio` criado na WORK-15.

---

## 4. Data design

### Sem mudanças no banco.

### Endpoint reutilizado para drill-down da pizza:
`GET /api/expenses?categoryId={uuid}&year={y}&month={m}&size=50&page=0`

Retorna `PageResponse<ExpenseResponse>` já existente. O frontend filtra apenas as despesas ACTIVE.

---

## 5. Interface design

### 5.1 — Bloco de portfólio no dashboard

Card abaixo dos KPIs (ou em coluna lateral, dependendo do layout):

```
┌─────────────────────────────────────────────┐
│ Portfólio                    R$ 12.450,00   │
│ ─────────────────────────────────────────── │
│ PETR4   100 cotas   R$ 38,50   +1,25% ▲    │
│ MXRF11   50 cotas   R$ 10,20   -0,30% ▼    │
│ VALE3   200 cotas   R$ 68,90   +0,80% ▲    │
│                                             │
│ ⚠ Cotações atualizadas há X horas          │
└─────────────────────────────────────────────┘
```

- Variação positiva: texto verde (`text-emerald-600`)
- Variação negativa: texto vermelho (`text-red-500`)
- Ticker indisponível: exibe "—" na coluna de preço e variação
- Se usuário não tem investimentos cadastrados: card oculto
- "Cotações atualizadas há X horas": calcula diferença entre `fetchedAt` mais antigo e `now()`

### 5.2 — Pizza interativa (drill-down)

**Comportamento ao clicar na fatia:**
- Cursor muda para `pointer` na fatia
- Abre `CategoryExpensesModal` com:
  - Título: nome da categoria + mês/ano selecionado no dashboard
  - Lista de despesas (descrição, data formatada DD/MM/YYYY, valor em BRL)
  - Ordenadas por data DESC
  - Se categoria não tem despesas no mês (edge case): "Nenhuma despesa encontrada."
  - Botão fechar

```
┌──────────────────────────────────────────┐
│ Mercado — Junho 2026              [X]    │
├──────────────────────────────────────────┤
│ Pão e leite        01/06/2026   R$ 25,50 │
│ Bolacha e café     10/06/2026   R$ 18,90 │
│ Compra do mês      20/06/2026  R$ 420,00 │
├──────────────────────────────────────────┤
│ Total                           R$ 464,40│
└──────────────────────────────────────────┘
```

**Implementação no Recharts:**
- `<Pie onClick={(data) => handleSliceClick(data)}>` — Recharts passa `{ name, value, payload }` no callback
- O `payload` contém o `categoryId` que já está nos dados do dashboard

### 5.3 — Fix alinhamento de colunas na tabela de despesas

Colunas da `ExpensesPage` precisam ter o conteúdo centralizado conforme o `align` definido no cabeçalho. Verificar todas as colunas da `Table<Expense>` em `ExpensesPage.tsx` e garantir que `align` está correto em cada uma:

| Coluna | Align correto |
|---|---|
| Descrição | left |
| Tipo | center |
| Categoria | left |
| Conta | left |
| Data compra | center |
| Valor | right |
| Status | center |
| Ações | right |

---

## 6. Component design

### Frontend

**`DashboardPage.tsx`** — modificações:
- Chamar `investmentService.getPortfolio()` em paralelo com `dashboardService.getBalance()` e `getExpensesByCategory()`
- Renderizar `<PortfolioCard>` abaixo dos KPIs se `portfolio.items.length > 0`
- Passar `onCategoryClick` para o `<PieChart>` com a categoria clicada e o mês/ano atual

**`PortfolioCard.tsx`** (novo componente em `components/ui/` ou `pages/dashboard/`):
- Props: `portfolio: InvestmentPortfolioResponse`
- Tabela simples: ticker, qtd, preço atual, variação %, valor de mercado
- Rodapé com total e timestamp de atualização

**`CategoryExpensesModal.tsx`** (novo, em `pages/dashboard/` ou `components/ui/`):
- Props: `open: boolean, onClose: () => void, categoryName: string, categoryId: string, year: number, month: number`
- Ao abrir: chama `expenseService.list({ categoryId, year, month, size: 50 })` (método existente ou novo param)
- Lista as despesas com descrição, data, valor
- Linha de total no rodapé

**`PieChart.tsx`** (componente existente) — adicionar prop opcional `onSliceClick?: (categoryId: string, categoryName: string) => void`. Dentro do `<Pie>`, adicionar:
```tsx
onClick={(data) => onSliceClick?.(data.payload.categoryId, data.name)}
style={{ cursor: onSliceClick ? 'pointer' : 'default' }}
```

**`expenseService.ts`** — verificar se o método `list()` já aceita `categoryId` como parâmetro. Se não, adicionar.

**`ExpensesPage.tsx`** — ajustar `align` em cada coluna conforme tabela da seção 5.3.

---

## 7. Open items

- **O-34:** Paginação na modal de drill-down — para categorias com muitas despesas. Por ora, limite de 50 (suficiente para um mês). Revisar se necessário.
- **O-35:** Clicar numa despesa dentro da modal para editar — **deixar para fase futura**.
- **O-36:** Mostrar investimentos no dashboard quando portfólio está vazio — mostrar mensagem "Nenhum investimento cadastrado" ou simplesmente ocultar o card? **Decisão: ocultar o card.**

---

## 8. Implementation plan

| Sub-task | Objetivo |
|---|---|
| 16.1 | Fix: `ExpensesPage` — corrigir `align` de todas as colunas |
| 16.2 | `PieChart.tsx` — adicionar prop `onSliceClick` + cursor pointer |
| 16.3 | `CategoryExpensesModal.tsx` — novo componente com lista de despesas |
| 16.4 | `DashboardPage.tsx` — conectar clique na pizza → modal |
| 16.5 | `PortfolioCard.tsx` — novo componente |
| 16.6 | `DashboardPage.tsx` — chamar `/portfolio` + renderizar `PortfolioCard` |
| 16.7 | TypeScript check (`tsc -b`) |

---

## Critério de "pronto"
```
[ ] Colunas da tabela de despesas alinhadas corretamente
[ ] Clicar na fatia do donut abre modal com despesas da categoria
[ ] Modal exibe descrição, data, valor e total
[ ] Card de portfólio aparece no dashboard com cotações
[ ] Variação positiva/negativa com cores corretas
[ ] Se sem investimentos, card não aparece
[ ] Diego aprova
```
