import { useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MonthDetailPanel, type MonthDetailKind } from './MonthDetailPanel';
import { formatCurrency } from '../../utils/currency';
import { MONTHS } from '../../utils/months';
import type { MonthEvolution } from '../../types/dashboard';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { SECTION_CARD_CLASSES } from '../../components/ui/sectionCard';

type Props = {
  data: MonthEvolution[];
  selectedYear: number;
  selectedMonth: number;
  visible: boolean;
  mask: (value: string) => string;
};

type Selection = { kind: MonthDetailKind; index: number };

const SALARY_COLOR = '#10b981'; // emerald-500 — entradas
const EXPENSES_COLOR = '#f87171'; // red-400 — saidas, sem cara de alerta

function shortMonth(month: number): string {
  return (MONTHS.find((m) => m.value === month)?.label ?? String(month)).slice(0, 3).toLowerCase();
}

// "R$ 2,5 mil", "R$ 10 mil", "R$ 800"
function axisCurrency(value: number): string {
  if (value < 1000) return `R$ ${Math.round(value)}`;
  const thousands = value / 1000;
  const text = Number.isInteger(thousands) ? String(thousands) : thousands.toFixed(1).replace('.', ',');
  return `R$ ${text} mil`;
}

export function EvolutionChart({ data, selectedYear, selectedMonth, visible, mask }: Props) {
  const [selection, setSelection] = useState<Selection | null>(null);

  const rows = data.map((d) => ({
    ...d,
    label: shortMonth(d.month),
    current: d.year === selectedYear && d.month === selectedMonth,
  }));
  const open = selection ? rows[selection.index] : undefined;

  // Recharts descarta barras de valor zero antes de numerar: use sempre originalDataIndex.
  function toggle(kind: MonthDetailKind, index: number) {
    setSelection((prev) => (prev?.kind === kind && prev.index === index ? null : { kind, index }));
  }

  function opacity(kind: MonthDetailKind, index: number): number {
    if (!selection) return 1;
    return selection.kind === kind && selection.index === index ? 1 : 0.35;
  }

  return (
    <div className={SECTION_CARD_CLASSES}>
      <SectionTitle
        icon={<ArrowLeftRight className="h-4 w-4" />}
        title="Entradas e saídas — mês a mês"
        tone="emerald"
        right={
          !selection && rows.length > 0 ? (
            <span className="text-xs text-slate-400">Clique numa barra para ver os lançamentos do mês</span>
          ) : undefined
        }
      />
      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">Sem dados para exibir.</p>
      ) : (
        <div className="h-64 [&_*:focus]:outline-none">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} barGap={4} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={({ x, y, payload, index }) => (
                  <text
                    x={x}
                    y={Number(y) + 12}
                    textAnchor="middle"
                    fontSize={12}
                    fill={rows[index]?.current ? '#0f172a' : '#64748b'}
                    fontWeight={rows[index]?.current ? 700 : 400}
                  >
                    {payload.value}
                  </text>
                )}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={visible ? 84 : 8}
                tick={visible ? { fontSize: 11, fill: '#94a3b8', style: { whiteSpace: 'nowrap' } } : false}
                tickFormatter={(v: number) => axisCurrency(v)}
              />
              <Tooltip
                // Sem animacao: deslizando da posicao anterior, estourava a borda e criava scroll.
                isAnimationActive={false}
                cursor={{ fill: '#f8fafc' }}
                formatter={(value, name) => [mask(formatCurrency(Number(value))), name]}
                labelFormatter={(_, payload) => {
                  const row = payload?.[0]?.payload as (typeof rows)[number] | undefined;
                  return row ? `${MONTHS.find((m) => m.value === row.month)?.label} / ${row.year}` : '';
                }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Bar
                dataKey="salary"
                name="Entradas (salário)"
                fill={SALARY_COLOR}
                radius={[4, 4, 0, 0]}
                maxBarSize={36}
                animationDuration={1500}
                cursor="pointer"
                onClick={(entry) => toggle('salary', entry.originalDataIndex)}
              >
                {rows.map((r, i) => (
                  <Cell key={`s-${r.year}-${r.month}`} fillOpacity={opacity('salary', i)} />
                ))}
              </Bar>
              <Bar
                dataKey="totalExpenses"
                name="Saídas (despesas)"
                fill={EXPENSES_COLOR}
                radius={[4, 4, 0, 0]}
                maxBarSize={36}
                animationDuration={1500}
                cursor="pointer"
                onClick={(entry) => toggle('expenses', entry.originalDataIndex)}
              >
                {rows.map((r, i) => (
                  <Cell key={`e-${r.year}-${r.month}`} fillOpacity={opacity('expenses', i)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {selection && open && (
        <div className="animate-slide-down">
          <MonthDetailPanel
            key={`${selection.kind}-${open.year}-${open.month}`}
            kind={selection.kind}
            year={open.year}
            month={open.month}
            mask={mask}
            onClose={() => setSelection(null)}
          />
        </div>
      )}
    </div>
  );
}
