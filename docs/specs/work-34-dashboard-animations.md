# WORK-34 — Animações do dashboard

## Metadados

- `spec_id`: WORK-34
- `titulo_tecnico`: Animações de entrada do dashboard: números contando, cascata dos cards, barras enchendo e bonecos animados
- `source_product_spec`: Conversa Diego ↔ Claude em 2026-10-05 ("faz as 4 animações"; "deixa dois segundos ao invés de 1")
- `baseline_branch_or_commit`: `master @ 500cfa3` (após WORK-33)
- `target_branch`: `feature/work-34-dashboard-animations`
- `escopo_sistema`: financial-front
- `última_atualização`: 2026-10-05

## Requisitos

| REQ | Descrição | Implementação |
|---|---|---|
| REQ-01 | **Números contando** de R$ 0 até o valor (e do valor antigo ao novo ao trocar o mês) | `useCountUp` (rAF, ease-out, **1,5 s**) + `AnimatedCurrency` — KPIs, centro da pizza, Portfólio, Rescisão; resumos de Salários e Rescisão |
| REQ-02 | **Cascata** dos cards ao abrir o dashboard | `Reveal` + keyframe `fade-up` (**600 ms**), atrasos de 120 ms: faixa → 4 KPIs → pizza/portfólio/rescisão → gráfico mês a mês |
| REQ-03 | **Barras enchendo** | `FillBar` (transição de largura **1,5 s**) nas mini barras do dashboard e dos resumos de Salários/Rescisão; barras do gráfico mês a mês com `animationDuration=1500` |
| REQ-04 | **Bonecos animados** | CSS dentro dos SVGs: feliz dá **pulinhos** e o confete **pisca**; triste **soluça** e **gotas caem** das lágrimas |
| REQ-05 | **Transição login → dashboard** (D-2, pedido após testar) | `LoginTransition`: tela cheia em degradê índigo→violeta→fúcsia, boneco feliz pulando, "Bem-vindo de volta, {nome}!" (ou "Bem-vindo" após cadastro) + "Preparando seu mês" com pontinhos; ~4 s (D-3) com fade de saída. Login/cadastro navegam com `state.welcome`; o dashboard carrega os dados por trás e só monta o conteúdo ao fim (a cascata aparece depois); o `state` é limpo ao terminar (reload não repete) |

## Regras

- Duração total ≈ **2 s** (D-1, pedido do Diego — 1 s era pouco)
- **D-3** (após teste): transição de login com **4 s**; boneco **sem círculo branco** (com sombra, "flutuando" no roxo); pontinhos **ao lado** do texto com animação "cobrinha" (`dot-hop`: um ponto pula de cada vez, em sequência, e repete)
- **Acessibilidade**: tudo desligado com "Reduzir movimento" do sistema (`motion-safe:` no Tailwind, `usePrefersReducedMotion` nos hooks, `@media (prefers-reduced-motion)` nos SVGs)
- Cascata só ao **abrir** o dashboard; ao trocar o mês só os números/barras se animam
- Olhinho: valores animados continuam mascarados
- `usePrefersReducedMotion` extraído do `PieChart` para `hooks/` (versão com `useSyncExternalStore`, sem setState em effect)

## Rollback

Reverter o merge (só front).
