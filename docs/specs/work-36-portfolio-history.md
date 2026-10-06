# WORK-36 — Histórico da carteira: aportes, importação da B3, proventos e evolução patrimonial

## Metadados

- `spec_id`: WORK-36
- `titulo_tecnico`: Trocar "editar quantidade" por movimentações (aportes); importar o extrato de movimentação da B3 (xlsx); registrar proventos; gráficos de evolução patrimonial e de proventos no dashboard
- `source_product_spec`: Conversa Diego ↔ Claude em 2026-10-06 (opção B aprovada; prints da B3 como referência; planilha `movimentacao-2026-10-06-00-25-56.xlsx`)
- `baseline_branch_or_commit`: `master @ 1f3486c` (após WORK-35)
- `target_branch`: `feature/work-36-portfolio-history`
- `escopo_sistema`: financial (backend) + financial-front
- `última_atualização`: 2026-10-06
- `status`: ✅ **Concluída** (2026-10-06) — aprovada por Diego após teste com os dados reais

## 1. Contexto e descobertas (análise feita antes da spec)

- Hoje `investments.quantity` é **sobrescrita** ao editar → não existe histórico; impossível saber quantas cotas havia em setembro
- **Planilha da B3** (07/10/2025 → 02/10/2026, 119 linhas): colunas `Entrada/Saída, Data, Movimentação, Produto, Instituição, Quantidade, Preço unitário, Valor da Operação`

| Movimentação | Qtd | Tratamento |
|---|---|---|
| Transferência - Liquidação (Crédito) | 76 | **compra** |
| Transferência - Liquidação (Débito) | 1 | **venda** (TAEE11) |
| Rendimento | 24 | **provento** (FII) |
| Dividendo | 6 | **provento** |
| Juros Sobre Capital Próprio | 1 | **provento** (JCP) |
| Leilão de Fração | 1 | **provento** (outros — dinheiro da venda de fração) |
| Bonificação em Ativos / Fração em Ativos | 2 | **ignorado** (se anulam: +0,32 e −0,32) |
| Direito de Subscrição / Cessão de Direitos / Não Exercido | 6 | **ignorado** (direitos MXRF12 não exercidos) |

- **Posição anterior ao extrato**: as compras do arquivo não fecham com a quantidade atual (GARE11 455 vs 371; MXRF11 436 vs 342; KLBN3 86 vs 56) porque Diego já tinha cotas antes de 07/10/2025 → **saldo inicial** = quantidade atual − movimentações líquidas: **GARE11 84, MXRF11 94, KLBN3 30**
- **Validação**: reconstruindo a posição dia a dia, **25 de 30** pagamentos de provento batem **exato** com a quantidade informada pela B3; 2 diferem só por compras entre data-com e pagamento; 3 (KLBN3) são dividendos declarados em dez/25 (32 ações) e pagos em parcelas — reconstrução correta
- Ativos fora do cadastro atual: **TAEE11** (comprou 7, vendeu 7 em 29/05/2026 — posição zerada) e **ROXO34** (2 cotas, BDR do Nubank)
- **Brapi plano gratuito**: histórico só de **3 meses** (`range` 1d/5d/1mo/3mo); `range=1y` e **dividendos** exigem plano pago (R$ 119,99/mês) → **não usaremos dados pagos**
- **Preço dos meses antigos**: estimado pelo **preço da última compra** do próprio Diego até o fim do mês. Comparado com os valores reais da B3: abr −0,1%, mai −0,8%, jun −0,7%, jul −0,2%, ago −2,4%, set −1,0% (com preço real da Brapi nos últimos 3 meses: todos ≤ 0,9%)

## 2. Requisitos

### REQ-01 — Movimentações (aportes) no lugar de editar quantidade
- Nova entidade `InvestmentTransaction`: `investment_id`, `user_id`, `type` (`INITIAL` saldo inicial | `BUY` | `SELL`), `trade_date`, `quantity` (inteiro > 0), `unit_price` (opcional p/ INITIAL), `total`, `source` (`MANUAL` | `B3_IMPORT`), `external_key` (dedupe da importação; único por usuário)
- `investments.quantity` passa a ser **derivada** (soma de INITIAL + BUY − SELL), recalculada a cada movimentação; o formulário de investimento deixa de editar a quantidade
- Venda maior que a posição → 422; quantidade 0 desativa o ativo automaticamente (ex.: TAEE11)
- **Migração** dos ativos existentes: cada ativo sem movimentações recebe um `INITIAL` com a quantidade atual (substituído pelo saldo inicial calculado se a B3 for importada)

### REQ-02 — Importar o extrato da B3 (.xlsx) — ❌ REMOVIDO (D-10)
> Usado uma única vez para carregar o histórico real de Diego (out/25 → set/26). Depois Diego decidiu lançar tudo à mão; o código da importação foi removido e **os dados importados permanecem** (origem `B3_IMPORT`). Texto original mantido abaixo como registro.

- Tela Investimentos → **"Importar B3"**: upload → **pré-visualização** (compras, vendas, proventos, ignorados, ativos novos, saldos iniciais calculados) → **Confirmar**
- Parser no backend com **JDK puro** (o .xlsx é zip + XML) — sem dependência nova
- **Idempotente**: cada linha vira um `external_key` (hash de data+movimentação+produto+qtd+valor); reimportar o mesmo arquivo ou um extrato novo **não duplica** — Diego pode importar todo mês
- Na **primeira** importação de um ativo, calcula o `INITIAL` (quantidade atual − movimentações do arquivo), datado no dia anterior à primeira linha (06/10/2025)
- **Só ativos já cadastrados** são importados (D-9): linhas de TAEE11 e ROXO34 aparecem na pré-visualização como "ignorado — ativo não cadastrado"
- Linhas ignoradas listadas na pré-visualização (transparência)

### REQ-03 — Proventos
- Nova entidade `InvestmentIncome`: `investment_id`, `user_id`, `type` (`RENDIMENTO` | `DIVIDENDO` | `JCP` | `OUTRO`), `payment_date`, `quantity` (cotas base, opcional), `unit_value` (opcional), `amount`, `source`, `external_key`
- Vêm da importação da B3 e podem ser **lançados à mão** ("Registrar provento")

### REQ-07 — Provento manual: "por cota" ou "total" + "a receber"
- Modal **Registrar provento**: ativo, tipo, **data de pagamento**, valor em modo **Total** (padrão) ou **Por cota** (total = cotas atuais × valor por cota, arredondado em 2 casas; grava `quantity` e `unit_value`)
- Atalho por linha na tela Investimentos (ícone de moedas, ao lado do ➕ aporte) com o ativo já selecionado; o botão do topo continua
- Data de pagamento **futura** = **a receber** (sem flag no banco: derivado de `payment_date > hoje`); vira recebido sozinho na data
- `GET /history`: cada mês traz `income` (recebido) e `incomePending` (a receber, só do mês corrente); `incomeLast90Days` conta só o recebido
- Dashboard (aba Proventos): barra empilhada — recebido em azul-marinho `#081B63`, a receber em azul vivo `#0A6BE0` (cores da B3, pedido do Diego); rótulo com o total do mês; tooltip separa os dois
- Histórico do ativo (⌄): proventos futuros com selo "a receber"

### REQ-04 — Preço de fechamento mensal
- Nova entidade `InvestmentMonthlyPrice`: `ticker`, `year`, `month`, `close_price`, `source` (`BRAPI` | `ESTIMATED`)
- `BRAPI`: último fechamento de cada mês dentro da janela de 3 meses do plano grátis, gravado de forma **persistente** (tarefa diária + sob demanda) → daqui para frente o histórico **não depende** da janela da Brapi
- `ESTIMATED`: meses fora da janela → preço da última compra do usuário até o fim do mês (ou da 1ª compra, se ainda não houver)
- Mês corrente: cotação ao vivo (já existente, cache Redis)

### REQ-05 — Dashboard: card "Evolução patrimonial" (abaixo de "Entradas e saídas")
- Card do **Portfólio inalterado** (D-8)
- Cabeçalho como na B3: **"Seu patrimônio cresceu R$ X (+Y%) nos últimos 30 dias"** + **"Você recebeu R$ Z em proventos nos últimos 90 dias"** + valor atual em destaque
- Alternância **Patrimônio | Proventos**:
  - **Patrimônio**: linha com área (12 meses), lista lateral mês → valor (como a B3); meses com preço estimado sinalizados no tooltip ("preço estimado")
  - **Proventos**: barras mensais com o valor recebido em cima de cada barra
- Respeita o olhinho e as animações da WORK-34
- Endpoint `GET /api/investments/history?months=12` → `[{year, month, marketValue, invested, income, estimated}]`

### REQ-06 — Tela Investimentos
- Botões **"Registrar aporte"** (compra/venda: ativo, data, quantidade, preço) e **"Registrar provento"**, e **"Importar B3"**
- Cada ativo expande o **histórico** (movimentações + proventos), com exclusão de lançamento manual (os importados podem ser excluídos também; a quantidade é recalculada)

## 3. Decisões

- **D-1** Opção B (movimentações) — aprovada por Diego
- **D-2** Importação da planilha da B3 com histórico real — aprovada
- **D-3** Saldo inicial calculado (84 / 94 / 30), validado contra os rendimentos
- **D-4** Mapeamento de movimentações da tabela da seção 1
- **D-5** Sem plano pago da Brapi: preços antigos **estimados** pela última compra (erro < 1–2% vs. B3); preços reais gravados mês a mês daqui para frente
- **D-6** Proventos: importação da B3 + lançamento manual
- **D-7** Gráficos no dashboard num **único card** com alternância Patrimônio | Proventos, abaixo de "Entradas e saídas"
- **D-8** Card Portfólio do dashboard permanece igual
- **D-10** (Diego, 2026-10-06): **abandonar a importação da B3** — aportes e proventos lançados à mão; dados já importados ficam
- **D-9** (Diego): importar **só os ativos já cadastrados** (GARE11, MXRF11, KLBN3); ROXO34 (cota antiga do Nubank) e TAEE11 ficam de fora

## 4. Fases de implementação

| Sub | Entrega |
|---|---|
| 36.1 | Entidades + migração (INITIAL) + quantidade derivada + endpoints de movimentação |
| 36.2 | Parser/importação B3 com pré-visualização e idempotência |
| 36.3 | Proventos (entidade, endpoints, importação) |
| 36.4 | Preços mensais (Brapi 3 meses + estimados) + `/api/investments/history` |
| 36.5 | Front: tela Investimentos (aporte, provento, importação, histórico por ativo) |
| 36.6 | Front: card "Evolução patrimonial" no dashboard |

## 5. Testes

- Unit: parser B3 com a planilha real (contagens por tipo; saldo inicial 84/94/30; reimportação sem duplicar); reconstrução de posição por data (rendimentos de exemplo batem); quantidade derivada; venda maior que a posição → 422; histórico mensal (estimado vs. Brapi)
- Manual: importar a planilha, conferir pré-visualização, confirmar; dashboard com 12 meses comparando com a B3 (abr–set dentro de ~1–2%); registrar aporte de outubro e ver o gráfico subir

## 6. Rollback

Reverter o merge. Tabelas novas ficam órfãs; `investments.quantity` mantém o último valor calculado.
