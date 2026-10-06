import { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Rectangle,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { RectangleProps } from 'recharts';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { SECTION_CARD_CLASSES } from '../../components/ui/sectionCard';
import { AnimatedCurrency } from '../../components/ui/AnimatedCurrency';
import { formatCurrency } from '../../utils/currency';
import { MONTHS } from '../../utils/months';
import type { PortfolioHistory } from '../../types/investment';

type Props = {
  history: PortfolioHistory;
  visible: boolean;
  mask: (value: string) => string;
};

type View = 'patrimony' | 'income';
type BarShapeProps = RectangleProps & { payload?: { incomePending: number } };

const LINE_COLOR = '#4f46e5'; // accent (indigo-600)
const INCOME_COLOR = '#081b63'; // azul-marinho (como a B3)
const PENDING_COLOR = '#0a6be0'; // azul vivo (a receber, como a B3)

function shortLabel(year: number, month: number): string {
  return `${MONTHS[month - 1].label.slice(0, 3).toLowerCase()}/${String(year).slice(2)}`;
}

function axisCurrency(value: number): string {
  if (value < 1000) return `R$ ${Math.round(value)}`;
  const k = value / 1000;
  return `R$ ${Number.isInteger(k) ? k : k.toFixed(1).replace('.', ',')} mil`;
}

/** Evolucao patrimonial e proventos mes a mes, no estilo da B3 (WORK-36). */
export function PortfolioEvolutionCard({ history, visible, mask }: Props) {
  const [view, setView] = useState<View>('patrimony');
  const rows = history.months.map((m) => ({
    ...m,
    label: shortLabel(m.year, m.month),
    // O rotulo do total vai na barra do topo da pilha: "a receber" se houver, senao "recebido".
    labelOnReceived: m.incomePending > 0 ? 0 : m.income,
    labelOnPending: m.incomePending > 0 ? m.income + m.incomePending : 0,
  }));
  const hasPending = history.months.some((m) => m.incomePending > 0);
  const last = history.months[history.months.length - 1];
  const monthName = last ? MONTHS[last.month - 1].label.toLowerCase() : '';
  const grew = history.changeThisMonth >= 0;
  const hasEstimated = history.months.some((m) => m.estimated);

  return (
    <div className={SECTION_CARD_CLASSES}>
      <SectionTitle
        icon={<TrendingUp className="h-4 w-4" />}
        title="Evolução patrimonial"
        tone="blue"
        right={
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium" role="tablist">
            {(
              [
                ['patrimony', 'Patrimônio'],
                ['income', 'Proventos'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={view === key}
                onClick={() => setView(key)}
                className={`rounded-md px-3 py-1 transition-colors ${
                  view === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-end justify-between gap-4 rounded-xl bg-gradient-to-r from-indigo-50 to-white px-4 py-3">
        <div className="text-sm">
          <p className="text-base text-slate-800">
            Seu patrimônio {grew ? 'cresceu' : 'caiu'}{' '}
            <strong className={grew ? 'text-emerald-600' : 'text-red-600'}>
              {mask(formatCurrency(Math.abs(history.changeThisMonth)))}
              {visible && history.changeThisMonthPercent !== null &&
                ` (${grew ? '+' : '−'}${Math.abs(history.changeThisMonthPercent).toFixed(2).replace('.', ',')}%)`}
            </strong>{' '}
            em {monthName}.
          </p>
          <p className="mt-0.5 text-slate-500">
            Você recebeu <strong className="text-emerald-600">{mask(formatCurrency(history.incomeLast90Days))}</strong> em
            proventos nos últimos 90 dias.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Valor atual</p>
          <p className="text-2xl font-semibold tabular-nums text-slate-900">
            <AnimatedCurrency value={history.currentValue} mask={mask} />
          </p>
        </div>
      </div>

      {view === 'patrimony' ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_15rem]">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="patrimonyFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={LINE_COLOR} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={LINE_COLOR} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={visible ? 84 : 8}
                  tick={visible ? { fontSize: 11, fill: '#94a3b8' } : false}
                  tickFormatter={axisCurrency}
                />
                <Tooltip
                  isAnimationActive={false}
                  formatter={(value) => [mask(formatCurrency(Number(value))), 'Patrimônio']}
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as (typeof rows)[number] | undefined;
                    if (!row) return '';
                    return `${MONTHS[row.month - 1].label}/${row.year}${row.estimated ? ' · preço estimado' : ''}`;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="marketValue"
                  stroke={LINE_COLOR}
                  strokeWidth={2.5}
                  fill="url(#patrimonyFill)"
                  animationDuration={1500}
                  dot={{ r: 3, fill: LINE_COLOR, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <ul className="max-h-64 divide-y divide-slate-100 overflow-auto rounded-lg border border-slate-200 text-sm">
            {[...rows].reverse().map((m) => (
              <li key={m.label} className="flex items-center justify-between px-3 py-2">
                <span className="text-slate-600">
                  {MONTHS[m.month - 1].label}/{String(m.year).slice(2)}
                  {m.estimated && <span className="ml-1 text-xs text-slate-400" title="Preço estimado pela última compra">*</span>}
                </span>
                <span className="font-medium tabular-nums text-slate-900">{mask(formatCurrency(m.marketValue))}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis hide />
              <Tooltip
                isAnimationActive={false}
                cursor={{ fill: '#f8fafc' }}
                content={({ active, payload }) => {
                  const row = payload?.[0]?.payload as (typeof rows)[number] | undefined;
                  if (!active || !row) return null;
                  return (
                    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
                      <p className="mb-1 font-medium text-slate-700">
                        {MONTHS[row.month - 1].label}/{row.year}
                      </p>
                      <p style={{ color: INCOME_COLOR }}>Recebido: {mask(formatCurrency(row.income))}</p>
                      {row.incomePending > 0 && (
                        <p style={{ color: PENDING_COLOR }}>A receber: {mask(formatCurrency(row.incomePending))}</p>
                      )}
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="income"
                stackId="income"
                fill={INCOME_COLOR}
                maxBarSize={40}
                animationDuration={1500}
                // Arredonda o topo so quando nao ha "a receber" empilhado em cima.
                shape={(props: BarShapeProps) => (
                  <Rectangle {...props} radius={(props.payload?.incomePending ?? 0) > 0 ? 0 : [4, 4, 0, 0]} />
                )}
              >
                {visible && (
                  <LabelList
                    dataKey="labelOnReceived"
                    position="top"
                    formatter={(v) => (Number(v) > 0 ? formatCurrency(Number(v)) : '')}
                    style={{ fontSize: 10, fill: '#475569' }}
                  />
                )}
              </Bar>
              <Bar
                dataKey="incomePending"
                stackId="income"
                fill={PENDING_COLOR}
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
                animationDuration={1500}
              >
                {visible && (
                  <LabelList
                    dataKey="labelOnPending"
                    position="top"
                    formatter={(v) => (Number(v) > 0 ? formatCurrency(Number(v)) : '')}
                    style={{ fontSize: 10, fill: '#475569' }}
                  />
                )}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {view === 'income' && (
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: INCOME_COLOR }} /> Recebido
          </span>
          {hasPending && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: PENDING_COLOR }} /> A receber
            </span>
          )}
          <span>Proventos entram pelo botão "Registrar provento" da tela Investimentos.</span>
        </p>
      )}
      {hasEstimated && view === 'patrimony' && (
        <p className="mt-3 text-xs text-slate-400">
          * Meses antigos usam o preço da sua última compra (o plano gratuito da cotação só guarda 3 meses). Daqui em diante o
          fechamento real de cada mês é gravado.
        </p>
      )}
    </div>
  );
}
