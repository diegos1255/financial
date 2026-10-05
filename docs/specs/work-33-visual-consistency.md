# WORK-33 — Consistência visual das telas (padrão do dashboard em todo o sistema)

## Metadados

- `spec_id`: WORK-33
- `titulo_tecnico`: Aplicar o padrão visual da WORK-32 (cards com identidade de cor, títulos com ícone, cores semânticas) em todas as telas + corrigir 3 bugs visuais
- `source_product_spec`: Conversa Diego ↔ Claude em 2026-10-05 (análise das 7 telas com prints; "pode fazer, vamos ver como vai ficar")
- `source_product_spec_version`: 1
- `baseline_branch_or_commit`: `master @ 7f84f87` (após WORK-32)
- `target_branch`: `feature/work-33-visual-consistency`
- `escopo_sistema`: financial-front (principal) + `data.sql` (acentos do menu)
- `última_atualização`: 2026-10-05

## 1. Objective

Deixar todas as telas com a mesma "família" visual do dashboard, sem mudar regras de negócio nem contratos de API.

**Fora de escopo**: telas de Email (Gmail), login/signup, modais (formulários), backend (exceto `data.sql`).

## 2. Requisitos

### Bugs (grupo 1)

| REQ | Problema | Correção |
|---|---|---|
| REQ-01 | Item ativo do menu com **contorno azul** (foco do clique preso no Safari) | `outline-none` + anel só em `focus-visible` |
| REQ-02 | Bolinha do chat **cobre a paginação** (Despesas, Categorias) | respiro inferior (`pb-24`) na área de conteúdo |
| REQ-03 | Menu **sem acento**: "Contas Bancarias", "Salarios" | `data.sql`: inserts desses itens passam a checar por **rota** (não por label) + `UPDATE` renomeando para "Contas Bancárias" / "Salários" (idempotente) |

### Padrão comum (grupo 2)

| REQ | Descrição |
|---|---|
| REQ-04 | `PageHeader` ganha **ícone em quadrado colorido** (mesmo ícone do menu) + subtítulo em todas as telas |
| REQ-05 | `Table` passa a ser renderizada **dentro de card** branco `rounded-2xl` com cabeçalho cinza-claro (remove envoltórios manuais de Despesas e PJ) |
| REQ-06 | Cards de resumo de **Salários** e **Rescisão** com faixa lateral colorida + toque de cor no fundo + `rounded-2xl` |
| REQ-07 | **Cores semânticas**: "Total do mês" (Despesas) em vermelho; "Impostos do mês" (PJ) em âmbar — hoje ambos verdes |

### Por tela (grupo 3)

| REQ | Tela | Descrição |
|---|---|---|
| REQ-08 | Categorias | **Grade de cartões** (faixa da cor da categoria, nome, descrição só se diferente do nome, ações) — sem paginação; busca e "mostrar inativos" mantidos |
| REQ-09 | Contas Bancárias | **Cartões** no mesmo estilo (ícone de cartão, nome, descrição, ações) |
| REQ-10 | Despesas | bolinha da **cor da categoria**; selos de tipo nas cores do dashboard (Fixa azul, Parcela âmbar, Variável violeta); coluna Parcelas mostra "—" quando vazia; botão **Filtros** contornado (não sólido) |
| REQ-11 | Investimentos | **3 cards de resumo**: valor de mercado total, variação do dia da carteira (ponderada pelo valor), nº de ativos; ticker em negrito; variação **vermelha quando negativa** |
| REQ-12 | PJ | **3 cards**: NF do mês, Impostos do mês (âmbar), **Líquido** (NF − impostos); remove coluna "Competência" (repete o filtro) |

## 2.1 Ajustes após teste na tela (Diego, 2026-10-05)

- **D-1**: Contas Bancárias — Diego sempre terá uma conta só; o cartãozinho ficava perdido. Troca por **cartão estilo cartão de banco** (`BankCard`: proporção real 1,586, degradê índigo→violeta→fúcsia, chip desenhado, nome grande; ações no canto)
- **D-2**: ícone do cabeçalho em âmbar (PJ, Rescisão) não agradou — PJ passa a **violeta**, Rescisão a **teal**
- **D-4**: conta com "Nubank" no nome usa o visual do **Nubank cromado** de Diego (champanhe metálico, "nu" roxo, círculos da bandeira, chip prateado, nome impresso em roxo); nome impresso derivado do cadastro (`utils/cardHolderName.ts`: "Diego dos Santos Oliveira" → "DIEGO S OLIVEIRA"). Outras contas mantêm o cartão genérico. Marcas desenhadas no código (texto/círculos), sem arquivos oficiais
- **D-3**: card de resumo da Rescisão (faixa + degradê) também sai do âmbar para **teal**, combinando com o ícone; ícone da Rescisão no dashboard idem

## 3. Decisões técnicas

- **Sem backend novo**: tudo com dados que as telas já carregam (Investimentos já tem preço/variação por ativo; PJ já tem NF e impostos)
- `KpiCard` (WORK-32) reutilizado nos resumos de Investimentos, PJ e Despesas
- Ícones/tons por tela: Categorias `Tag`/índigo, Contas `CreditCard`/azul, Salários `DollarSign`/verde, Despesas `ShoppingCart`/vermelho, Investimentos `TrendingUp`/azul, PJ `Briefcase`/violeta, Rescisão `Handshake`/teal (D-2)
- Selos de tipo de despesa centralizados num único mapa (hoje duplicados entre Despesas e o painel do dashboard)

## 4. Test plan

- `tsc` limpo; sem erros de lint **novos**
- Manual (Docker, `http://localhost`): cada uma das 7 telas — visual, busca/filtros, criar/editar/remover continuam funcionando; menu sem contorno azul ao clicar; paginação não coberta pelo chat; menu com acentos e **sem itens duplicados**
- Regressão: dashboard (WORK-32) inalterado

## 5. Rollback

Reverter o merge. `data.sql`: os labels acentuados permanecem (inofensivo).

## Critério de "pronto"

```
[ ] REQ-01..12 implementados
[ ] Menu com acentos, sem duplicar itens após reiniciar o backend 2x
[ ] Diego testa e aprova → commit na feature/work-33-visual-consistency → merge na master
```
