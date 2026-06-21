# Spec — Redesign do Gráfico de Despesas por Categoria (Donut + Animação)

## Metadados

- **spec_id:** `WORK-09E`
- **titulo_tecnico:** Refatoração do componente `PieChart` para estilo donut com total central, paleta vibrante e animação suave de entrada
- **source_product_spec:** Feedback visual do Diego em 2026-06-09 — print de referência `despesas.png` mostrando donut chart elegante; pizza atual "muito feia"; animação suave de preenchimento ao abrir a tela é desejada.
- **source_product_spec_version:** v1 — 2026-06-09
- **baseline_branch_or_commit:** pós-WORK-09D
- **target_branch:** main
- **escopo_sistema:** `financial-front` (SPA)
- **última_atualização:** 2026-06-09

---

## 1. Objective do documento

**O que esta spec permite:**
- Apresentar as despesas por categoria com qualidade visual profissional alinhada com sistemas financeiros modernos (donut com total central, paleta vibrante, legend horizontal, animação suave).
- Manter o componente preparado para receber cor por categoria quando a feature de color picker chegar (combinada para a próxima sessão — ver [[project-pending-color-picker]]).

**O que esta spec não cobre:**
- Color picker no CategoryFormModal (próxima sessão).
- Cor por categoria persistida no backend (próxima sessão).
- Tooltip customizado (segue o default do Recharts).
- Dark mode.

**Artefatos complementares:**
- Print de referência: `D:\claude\financial\despesas.png`.

---

## 2. System overview

**Estado atual:** `PieChart.tsx` é um wrapper Recharts solid (`<Pie>` sem `innerRadius`), legend default do Recharts, cores indigo/sky/emerald/amber/red/violet/pink/teal, sem total central, sem animação tunada. Visualmente datado.

**Estado alvo:** donut com `innerRadius=0.7 * outerRadius`, total central em duas linhas ("SAÍDAS NO MÊS" + valor BRL), paleta vibrante hardcoded de 11 cores, legend horizontal embaixo com bolinhas e nomes, animação `ease-out` de 900ms ao montar.

**Delta técnico:**
- 1 arquivo refatorado: `src/components/ui/PieChart.tsx`.
- 1 arquivo ajustado: `src/pages/DashboardPage.tsx` (passa total ao componente, header com ícone).

**Escopo explícito:**
- Donut chart.
- Total central calculado a partir dos dados.
- Paleta vibrante hardcoded.
- Animação de entrada suave.
- Legend horizontal compacta.
- Header do card com ícone.

**Fora de escopo:**
- Backend changes.
- Tooltip customizado (Recharts default basta).
- Mudança no `dashboardService` ou DTOs.
- Color picker.

**Restrições obrigatórias:**
- Empty state continua funcionando (mensagem "Sem dados" quando array vazio).
- Acessibilidade: contraste mínimo da legend (texto slate-700 sobre fundo branco).
- Animação respeitando `prefers-reduced-motion` do usuário (Recharts não desliga sozinho — implementação manual via media query).
- Manter API atual do componente: aceitar `data: { name, value }[]` e opcional `emptyMessage`.

---

## 3. Architecture design

**Sem mudança arquitetural.** Apenas refatoração interna de um componente isolado.

**Componente:**
```
DashboardPage
  ├── KpiCard × 3
  └── Card "Despesas por categoria"
        └── PieChart  ← refatorado (donut + total central + paleta + animação)
```

**Trade-offs:**
- **Paleta hardcoded vs. cor por categoria:** hardcoded por ora. Trade-off aceito porque o color picker depende de backend e vem na próxima sessão. Quando chegar, o componente recebe `colors?: Record<string, string>` como prop opcional e usa a cor mapeada quando disponível, com fallback pra paleta atual.
- **Total central via SVG `<text>` (Recharts Label) vs. div absolute:** vamos tentar Label primeiro (idiomático). Se a centralização ficar instável em viewports menores, plano B é `<div absolute>` sobre o ResponsiveContainer.
- **Animação 900ms ease-out:** ligeiramente mais longa que o default (800ms) pra dar sensação de "preenchendo" suave. Valor empírico — ajustável.

---

## 4. Data design

Sem mudança de dados.

---

## 5. Interface design

Sem mudança de contrato de API ou DTOs.

**Interface do componente `PieChart`:**

Antes:
```ts
type Props = {
  data: { name: string; value: number }[];
  emptyMessage?: string;
};
```

Depois:
```ts
type Props = {
  data: { name: string; value: number }[];
  centerTotal?: number;          // novo: valor formatado em BRL no centro do donut
  centerLabel?: string;          // novo: texto acima do total (default: "SAÍDAS NO MÊS")
  emptyMessage?: string;
};
```

---

## 6. Component design

### `PieChart.tsx`

**Paleta:**
```ts
const PALETTE = [
  '#1e3a5f', // azul-marinho
  '#dc2626', // vermelho
  '#06b6d4', // ciano
  '#059669', // verde
  '#475569', // cinza chumbo
  '#a78bfa', // lavanda
  '#f87171', // coral
  '#ec4899', // pink
  '#7c3aed', // violeta
  '#0f172a', // quase preto
  '#86efac', // verde claro
];
```

**Layout:**
- `<ResponsiveContainer width="100%" height={320}>`
- `<PieChart>` (Recharts)
  - `<Pie>` com `innerRadius={70}`, `outerRadius={110}`, `paddingAngle={2}`, `dataKey="value"`, `isAnimationActive`, `animationDuration={900}`, `animationBegin={0}`, `animationEasing="ease-out"`
  - `<Cell>` por entry, `fill={PALETTE[i % PALETTE.length]}`
  - `<Label>` no centro (se `centerTotal` definido), renderizado via função custom: dois `<text>` tspan
- `<Tooltip>` default do Recharts, com `formatter={(v) => formatCurrency(Number(v))}`
- Legend horizontal manual abaixo do gráfico (fora do Recharts `<Legend>`, pra ter controle de estilo):
  ```tsx
  <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2">
    {data.map((entry, i) => (
      <div key={entry.name} className="flex items-center gap-2 text-sm text-slate-700">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
        />
        {entry.name}
      </div>
    ))}
  </div>
  ```

**Total central (função custom renderizada como label):**
```tsx
<Label content={({ viewBox }) => {
  const { cx, cy } = viewBox as { cx: number; cy: number };
  return (
    <g>
      <text x={cx} y={cy - 8} textAnchor="middle" className="fill-slate-400 text-xs tracking-wider">
        {centerLabel ?? 'SAÍDAS NO MÊS'}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" className="fill-slate-900 text-lg font-semibold">
        {formatCurrency(centerTotal ?? 0)}
      </text>
    </g>
  );
}} position="center" />
```

**Empty state:** mantido — quando `data.length === 0`, renderiza `<div>` com `emptyMessage` em vez do gráfico.

**Reduced motion:**
- Checar via `window.matchMedia('(prefers-reduced-motion: reduce)').matches`.
- Se true, `isAnimationActive={false}` na `<Pie>`.

### `DashboardPage.tsx`

Antes (trecho do card):
```tsx
<div className="rounded-xl border border-slate-200 bg-white p-5 shadow-soft">
  <h2 className="text-base font-semibold text-slate-900 mb-3">Despesas por categoria</h2>
  <PieChart data={byCategory.map((c) => ({ name: c.categoryName, value: c.total }))} />
</div>
```

Depois:
```tsx
import { PieChart as PieIcon } from 'lucide-react';

const totalCategories = byCategory.reduce((sum, c) => sum + c.total, 0);

<div className="rounded-xl border border-slate-200 bg-white p-5 shadow-soft">
  <div className="flex items-center gap-2 mb-1">
    <PieIcon className="h-4 w-4 text-slate-400" />
    <h2 className="text-xs font-semibold text-slate-500 tracking-wider uppercase">
      Despesas por categoria
    </h2>
  </div>
  <div className="border-t border-slate-100 -mx-5 mb-3" />
  <PieChart
    data={byCategory.map((c) => ({ name: c.categoryName, value: c.total }))}
    centerTotal={totalCategories}
    centerLabel="SAÍDAS NO MÊS"
  />
</div>
```

---

## 7. UI and interaction design

**Telas alteradas:** Dashboard apenas — o card "Despesas por categoria" ganha visual donut + total central + legend horizontal + animação de entrada.

**Animação ao abrir:** cada fatia anima do raio interno até o externo em 900ms com easing `ease-out`. Visualmente o donut "se preenche" do centro pra fora.

**Estados visuais:**
- Loading (já existente na DashboardPage): pizza fica vazia até o fetch resolver.
- Empty: mensagem "Sem dados".
- Reduced motion: animação desligada.

**Responsividade:** desktop-first. Donut centralizado, legend wrap em múltiplas linhas se necessário.

---

## 8. Runtime and operations

Sem impacto.

---

## 9. Security, privacy and compliance

Sem impacto. Cores hardcoded não vazam nada.

---

## 10. Requirement mapping

- **REQ-08 (Gráfico pizza):** refinamento visual. Funcionalidade preservada, apresentação modernizada.

---

## 11. Implementation plan

### Checklist

- [ ] `src/components/ui/PieChart.tsx` — refator completo (donut, paleta, total central, legend manual, animação, reduced-motion)
- [ ] `src/pages/DashboardPage.tsx` — calcular total, passar `centerTotal`, ajustar header do card com ícone

### Validação

- [ ] `npx tsc --noEmit` — zero erros
- [ ] Smoke manual: dashboard abre, animação suave aparece, donut com total no centro, legend embaixo
- [ ] Empty state: filtrar mês sem despesas — mensagem "Sem dados" aparece
- [ ] DevTools com `prefers-reduced-motion: reduce` → animação desligada

---

## 12. Test plan

**Manual:**

1. Carregar `/dashboard` em Junho/2026 → donut anima do centro pra fora; centro mostra "SAÍDAS NO MÊS" + total formatado em BRL; legend horizontal embaixo com bolinhas coloridas.
2. Trocar filtro pra Julho/2026 → animação reinicia, dados atualizam.
3. Filtrar pra mês sem dados (ex: Janeiro/2026) → mensagem empty exibida.
4. Inspecionar com DevTools → toggle `prefers-reduced-motion: reduce` → recarregar → sem animação.
5. Regressão: KPIs em cima continuam corretos; nenhum console error.

---

## 13. Open items

| # | Item | Decisão |
|---|---|---|
| O-01 | Cor por categoria persistida no banco + color picker | Próxima sessão (ver [[project-pending-color-picker]]) |
| O-02 | Tooltip customizado com bolinha colorida | Aceitar default do Recharts por ora |
| O-03 | Legend ordenada por valor desc vs. ordem do array | Aceitar ordem do array (já vem ordenada do backend por valor) |
