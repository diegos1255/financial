# WORK-32 — Dashboard mais informativo (KPIs ricos, cores semânticas, evolução mensal)

## Metadados

- `spec_id`: WORK-32
- `titulo_tecnico`: Enriquecer o dashboard: Salário com previsto + mini barra, Saldo previsto, chips de impostos PJ, vermelho só quando faz sentido e gráfico de evolução dos últimos 6 meses (pizza de categorias mantida)
- `source_product_spec`: Conversa Diego ↔ Claude em 2026-10-04 ("gostei das sugestões, a gente vê como fica")
- `source_product_spec_version`: 1
- `baseline_branch_or_commit`: `master @ 6e1fbf1` (após WORK-31)
- `target_branch`: `feature/work-32-dashboard-insights` (a criar a partir da `master`)
- `escopo_sistema`: financial-front (principal) + financial (1 endpoint novo)
- `última_atualização`: 2026-10-04

## 1. Objective do documento

- O que esta spec técnica precisa permitir que engenharia faça:
  - **REQ-01** Card **Salário**: mostrar "de R$ X previstos" + **mini barra** com as faixas de cor da tela de Salários (WORK-30, D-5)
  - ~~REQ-02 "Previsto" no Saldo~~ — **substituído (D-5/D-6)** pelo boneco feliz/triste
  - **REQ-03** Card **Impostos PJ**: chips DAS / INSS / Contabilidade (mesmo visual dos chips de Despesas)
  - **REQ-04** **Cores semânticas**: valor zero nunca aparece em vermelho (Impostos PJ = R$ 0,00 fica neutro)
  - ~~REQ-05 categorias em barras~~ — **removido (D-1)**: a pizza de despesas por categoria fica **exatamente como está**
  - **REQ-06** Novo card **Evolução (últimos 6 meses)**: Salário × Despesas por mês
- O que esta spec **não** cobre:
  - Mudanças em Portfólio e Rescisão (WORK-31 acabou de definir)
  - Mudanças no gráfico de pizza de categorias (D-1: Diego prefere a pizza como está)
  - Novos filtros, exportação, metas/orçamento por categoria
  - Corrigir os erros de lint pré-existentes do `DashboardPage` (fora do escopo; só não criar novos)
- Artefatos complementares: WORK-16 (dashboard enrichments), WORK-30 (salário), WORK-31 (rescisão)

## 2. System overview

- **Estado atual resumido**: 4 KPIs (Salário, Total de Despesas com chips, Saldo, Impostos PJ do mês anterior); pizza de despesas por categoria (20+ fatias, legenda extensa) à esquerda; Portfólio + Rescisão empilhados à direita
- **Estado alvo resumido**:

```
┌ SALÁRIO ──────────┐┌ TOTAL DE DESPESAS ┐┌ SALDO ────────────┐┌ IMPOSTOS PJ ──────┐
│ R$ 15.000,00      ││ R$ 8.162,27       ││ R$ 6.837,73       ││ R$ 1.230,00       │
│ de R$ 16.000 prev.││ [Fixas][Variáveis]││ Previsto:         ││ [DAS][INSS]       │
│ ████████████░ 94% ││ [Pagas][Pendentes]││ R$ 7.837,73       ││ [Contabilidade]   │
└───────────────────┘└───────────────────┘└───────────────────┘└───────────────────┘
┌ DESPESAS POR CATEGORIA ───────────────┐┌ PORTFÓLIO ──────────────────────┐
│                                       ││ ...                             │
│        (pizza — sem mudança)          │└─────────────────────────────────┘
│                                       │┌ RESCISÃO ───────────────────────┐
│                                       ││ ...                             │
└───────────────────────────────────────┘└─────────────────────────────────┘
┌ EVOLUÇÃO — ÚLTIMOS 6 MESES ─────────────────────────────────────────────────┐
│   ▇▆   ▇▅   ▇▇   ▇▆   ▇▄   ▇▅      ■ Salário  ■ Despesas                   │
│  mai  jun  jul  ago  set  out                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Delta técnico**: front reorganiza/enriquece o `DashboardPage`; backend ganha `GET /api/dashboard/evolution`
- **Restrições obrigatórias**: respeitar o "olhinho" (`mask`) em **todos** os valores novos (inclusive tooltip e eixo do gráfico); não alterar regras de cálculo existentes (Salário = recebido, WORK-30; Rescisão fora do saldo, WORK-31)

## 3. Architecture design

- **Front**: `DashboardPage` passa a buscar também o **mês de salário** (`salaryService.getMonth`, já existente) e a **evolução** (endpoint novo). Componentes novos em `pages/dashboard/`.
- **Back**: `DashboardService` extrai o cálculo do balanço de um mês para um método privado reutilizável e expõe `evolution(year, month, months)`.
- **Trade-offs assumidos**:
  - **Saldo previsto calculado no front** (dados já disponíveis: `expectedAmount` do salário + `totalExpenses` do balanço) — evita mudar o contrato do `/balance`
  - **Evolução no backend** (1 chamada, N meses) em vez de N chamadas ao `/balance` pelo front
  - **Recharts** (já é dependência) no gráfico de evolução
  - Faixas de cor do salário viram util compartilhado (`pages/salaries/salaryTone.ts`) — mesma regra na tela de Salários e no dashboard

## 4. Data design

- Nenhuma entidade nova ou alterada; nenhum dado migrado
- Evolução: leitura agregada sobre as mesmas tabelas do `/balance` (salary_payments, expenses, installments)

## 5. Interface design

- **Novo endpoint**: `GET /api/dashboard/evolution?year=2026&month=10&months=6`
  - `year`/`month` opcionais (default = mês atual, como o `/balance`); `months` default 6, **1..12** (400 fora disso)
  - Resposta 200: lista **cronológica** (mais antigo → selecionado)

```jsonc
[
  { "year": 2026, "month": 5, "salary": 16000.00, "totalExpenses": 8900.10, "balance": 7099.90 },
  ...
  { "year": 2026, "month": 10, "salary": 15000.00, "totalExpenses": 8162.27, "balance": 6837.73 }
]
```

  - Mesmas regras do `/balance` para cada mês (Salário = soma dos recebimentos; despesas = fixas + parcelas + variáveis)
  - JWT + isolamento por usuário
- **Endpoints existentes reutilizados** (sem mudança): `/api/dashboard/balance`, `/api/dashboard/expenses-by-category`, `/api/salaries/{y}/{m}`, `/api/pj-entries`

## 6. Component design

### `CMP-01` Backend — `DashboardService.evolution`
- Extrai `computeBalance(userId, YearMonth)` do `balance()` atual (sem mudar o resultado do `/balance`)
- `evolution(year, month, months)`: itera os `months` meses terminando no selecionado; devolve `List<MonthEvolutionResponse>`
- Arquivos: `service/DashboardService.java`, `controller/DashboardController.java`, `dto/MonthEvolutionResponse.java` (novo); teste `DashboardServiceTest` (novo, foco na ordem/quantidade de meses e virada de ano)

### `CMP-02` Card Salário (REQ-01)
- Subtítulo: "de R$ 16.000,00 previstos" + mini barra (largura = recebido / previsto; cor = `salaryTone(recebido)`: até 5 mil vermelho, até 10 mil laranja, acima verde) + %
- Sem total previsto no mês → sem subtítulo (como hoje)
- Arquivo: `pages/salaries/salaryTone.ts` (novo, extraído de `SalarySummaryCard`), `DashboardPage.tsx`

### `CMP-03` Card Saldo (REQ-02)
- Subtítulo "Previsto: R$ Y" (Y = previsto − despesas), em verde/vermelho conforme sinal; só aparece se houver total previsto
- Arquivo: `DashboardPage.tsx`

### `CMP-04` Card Impostos PJ (REQ-03, REQ-04)
- Chips DAS / INSS / Contabilidade (reusa `BreakdownChip`) com os valores do mês anterior (dados que o dashboard já busca)
- **Variant**: `negative` (vermelho) só se total > 0; senão `neutral`
- Arquivo: `DashboardPage.tsx`

### `CMP-06` Evolução 6 meses (REQ-06)
- Componente `pages/dashboard/EvolutionChart.tsx`, card full width abaixo da linha categorias/portfólio
- Recharts `BarChart`: barras agrupadas **Salário** (verde) × **Despesas** (cinza-azulado); eixo X = "mai", "jun"...; tooltip com valores formatados
- Olhinho fechado → eixo Y sem números e tooltip mascarado
- Mês selecionado destacado (rótulo em negrito)

## 7. UI and interaction design

- **Telas alteradas**: só o Dashboard (layout da seção 2)
- **Estados**: loading (cards com "Carregando..." como hoje; gráfico com skeleton), vazio (categorias / evolução sem dados), erro (banner de erro já existente)
- **Responsividade**: gráfico de evolução com `ResponsiveContainer`
- **Acessibilidade**: mini barras com `role="progressbar"`

## 8. Runtime and operations

- Sem config/flags. Rollout: `docker compose up -d --build`. Rollback: imagem anterior.

## 9. Security, privacy and compliance

- Nada novo; endpoint novo isolado por usuário; valores respeitam o modo "ocultar valores"

## 10. Requirement mapping

| REQ | Critério de aceite |
|---|---|
| REQ-01 | Salário mostra "de R$ X previstos" + mini barra colorida quando há total previsto no mês |
| REQ-02 | Saldo mostra "Previsto: R$ Y" = previsto − despesas, com cor pelo sinal |
| REQ-03 | Impostos PJ mostra chips DAS/INSS/Contabilidade |
| REQ-04 | Impostos PJ = R$ 0,00 aparece neutro (não vermelho) |
| REQ-06 | Gráfico Salário × Despesas dos 6 meses até o selecionado; mascara com o olhinho |

## 11. Implementation plan input

| Sub-WORK | Objetivo | Como validar |
|---|---|---|
| WORK-32.1 | Endpoint `/evolution` + `DashboardServiceTest` | testes + curl; `/balance` inalterado |
| WORK-32.2 | `salaryTone.ts` compartilhado + KPIs Salário/Saldo/Impostos | visual + olhinho |
| WORK-32.4 | `EvolutionChart` | 6 meses na ordem; olhinho |
| WORK-32.5 | Postman (`/evolution`) | request roda |

## 12. Test plan

- **Unitários**: `DashboardServiceTest` — 6 meses cronológicos terminando no selecionado; virada de ano (jan/2027 → ago..dez/2026 + jan/2027); `months` fora de 1..12 → 400 (controller)
- **Manuais**: (1) Salário com e sem total previsto; (2) Saldo previsto com sinal +/−; (3) Impostos zerado neutro / com valor vermelho + chips; (4) pizza inalterada (clique na fatia abre o modal); (5) evolução com meses corretos; (6) olhinho mascara tudo; (7) trocar mês/ano atualiza tudo
- **Regressões**: pizza de categorias, Portfólio e Rescisão na coluna direita; telas de Salários e Rescisão (cores) inalteradas

## 13. Open items

- **Decisões tomadas**: Diego aprovou as 4 sugestões em 2026-10-04 ("a gente vê como fica") — ajustes visuais finos serão feitos após teste na tela, como nas WORK-30/31
  - **D-1** (Diego, 2026-10-04): **manter o gráfico de pizza** de categorias como está — sem barras, sem agrupamento
  - **D-3** (após teste na tela): o card se chama **"Entradas e saídas — mês a mês"** (não "Evolução"); despesas em **vermelho suave** (`red-400`), salário em verde; eixo Y sem quebra de linha e com valores redondos ("R$ 2,5 mil", "R$ 10 mil")
  - **D-4** (após teste na tela): **clicar numa barra** abre, **abaixo do gráfico** (painel que desliza, não modal), os lançamentos daquele mês — barra vermelha → despesas (data, descrição, categoria, tipo, valor; maior primeiro), barra verde → recebimentos de salário. Clicar de novo na mesma barra fecha; clicar em outra troca; a barra aberta fica destacada. Lista vem de **`GET /api/dashboard/month-expenses`** (novo), que usa **os mesmos filtros** das somas do balanço (constantes compartilhadas no `DashboardRepository`) — a soma da lista sempre fecha com a barra
  - **D-5** (após teste na tela): **removida** a linha "Previsto" do card Saldo (REQ-02 cancelado) — confundia e, com os recebimentos lançados, o próprio saldo já mostra a realidade
  - **D-6** (após teste na tela): card Saldo ganha um **boneco ilustrado** (desenho original em SVG, estilo rabisco, em `financial-front/src/assets/mascots/`): **feliz** com óculos pixelados e confete quando saldo **≥ 0**; **triste** chorando quando **< 0**. Com o "olhinho" fechado o boneco **não aparece** (entregaria o sinal do saldo). `KpiCard` ganha prop opcional `footer`
  - **D-7** (após teste na tela, substitui o boneco no card do D-6): o título "Dashboard / Visão geral do mês" vira uma **faixa de boas-vindas** (`pages/dashboard/DashboardHero.tsx`): degradê índigo suave, saudação pelo horário com o primeiro nome ("Boa noite, Diego 👋" — 5h–11h59 bom dia, 12h–17h59 boa tarde, demais boa noite, incluindo a madrugada), degradê índigo-100 → índigo-50 (35%) → branco (60%), frase logo abaixo do mês, mês/ano, **frase-resumo do mês** e o **boneco** reagindo (feliz se saldo ≥ 0; triste se < 0). Frases: positivo → "Mandou bem! Sobraram R$ X em {mês}."; negativo com salário a entrar → "Você está R$ X no vermelho em {mês} — ainda faltam R$ Y do salário entrar."; negativo sem salário a entrar → "Atenção: os gastos de {mês} passaram das entradas em R$ X."; sem lançamentos → "Nenhum lançamento em {mês} ainda.". Olhinho fechado → sem boneco e frase neutra. Filtros (olhinho/mês/ano) dentro da faixa. Card Saldo volta ao normal (`KpiCard` sem mudanças)
  - **D-8** (após teste na tela): cards com **identidade de cor**, sem mudar o conteúdo. KPIs (`KpiCard`, prop `accent`): faixa colorida na lateral esquerda, ícone em quadrado arredondado colorido, toque suave da cor no fundo (degradê até ~45%), cantos `rounded-2xl` e sombra no hover — Salário verde, Despesas vermelho, Saldo verde/vermelho pelo sinal, Impostos âmbar. Cards de seção: novo `SectionTitle` (ícone em quadrado colorido + título mais forte, sem linha divisória) e moldura `SECTION_CARD_CLASSES` — categorias índigo, Portfólio azul, Rescisão âmbar, Entradas e saídas verde
  - **D-9** (após teste na tela): tooltip da pizza vira componente próprio, ancorado **do lado de fora da fatia** (pelo `midAngle`), para nunca cobrir o total do centro; texto escuro com bolinha da cor da categoria (cores claras ficavam ilegíveis); respeita o olhinho (antes mostrava o valor mesmo oculto)
  - **D-2** (Diego, 2026-10-04): evolução de **6 meses**; o topo do dashboard continua focado no mês selecionado e o gráfico fica no fim da página, com o mês selecionado destacado
- **Riscos**: com poucos meses de dados no Mac (base nova desde outubro/2026), a evolução vai mostrar meses vazios por enquanto

## Critério de "pronto"

```
[ ] /api/dashboard/evolution + DashboardServiceTest passando; /balance inalterado
[ ] KPIs Salário (previsto + barra), Saldo (previsto), Impostos (chips + neutro no zero)
[ ] Evolução 6 meses
[ ] Olhinho mascara todos os valores novos
[ ] tsc limpo; sem erros de lint novos
[ ] Diego testa e aprova → commit na feature/work-32-dashboard-insights → merge na master
```
