# Ajustes de usabilidade — agosto/2026

Branch: `feature/usabilidade`. Ajustes pontuais de UX que não pediram spec formal (fluxo SDD é pra features grandes). Registro aqui pra facilitar rastreio de "por que isso está assim".

## #1 — Filtros de despesas via modal

**Contexto.** A tela `/expenses` já tinha filtros de mês/ano/status inline no header. Diego queria mais 4 filtros (Tipo, Categoria, Data da Compra, Ordenação) sem entupir a tela.

**Decisão.** Modal dedicada de filtros:

- **Botão "Filtros"** no header, ao lado do chip "Total do mês". Mostra badge com contador `Filtros (N)` quando há filtros ativos.
- **Modal** com 4 seções:
  - **Tipo** — select único: Todas / Fixa / Parcelada / Variável
  - **Categoria** — select único (não multi, pra simplificar UI): Todas / \[lista\]
  - **Data da compra** — 2 inputs `date`: De / Até. Opcionais.
  - **Ordenação** — select: Data da compra (padrão) / Maior valor / Menor valor
- **Botões modal**: Cancelar (fecha sem persistir) / Limpar (reseta campos sem fechar) / Aplicar (persiste e fecha).
- **Botão "Limpar filtros"** fora da modal, ao lado do "Filtros (N)", **só aparece com filtros ativos**. Estilo cinza (não a cor accent) pra sinalizar ação secundária/destrutiva sem urgência.
- **Aplicação client-side** — a lista já vem toda pro estado; filtragem/ordenação em cima do array em memória. Sem novo endpoint. Se corpus crescer muito no futuro, mover pro backend.

**Por que não spec formal.** Escopo pequeno, sem impacto em contrato de API, sem risco arquitetural, mudança contida em 2 arquivos frontend.

**Comportamento default preservado.** Sem filtros aplicados = lista igual antes (ordenada por data da compra desc).
