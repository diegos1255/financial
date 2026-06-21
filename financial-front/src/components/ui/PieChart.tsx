import { useEffect, useState } from 'react';
import { Cell, Pie, PieChart as RePieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '../../utils/currency';

type Slice = {
  name: string;
  value: number;
  color?: string;
  categoryId?: string;
};

type PieChartProps = {
  data: Slice[];
  centerTotal?: number;
  centerLabel?: string;
  emptyMessage?: string;
  onSliceClick?: (categoryId: string, categoryName: string) => void;
};

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

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

export function PieChart({
  data,
  centerTotal,
  centerLabel = 'SAÍDAS NO MÊS',
  emptyMessage = 'Sem dados para o período.',
  onSliceClick,
}: PieChartProps) {
  const reducedMotion = usePrefersReducedMotion();

  if (data.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div>
      <div className="relative h-72">
        <ResponsiveContainer width="100%" height="100%">
          <RePieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={110}
              paddingAngle={2}
              stroke="none"
              isAnimationActive={!reducedMotion}
              animationBegin={0}
              animationDuration={900}
              animationEasing="ease-out"
              style={{ cursor: onSliceClick ? 'pointer' : 'default' }}
              onClick={(data) => {
                const id = data?.payload?.categoryId as string | undefined;
                if (onSliceClick && id) {
                  onSliceClick(id, data.name as string);
                }
              }}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color ?? PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) => formatCurrency(Number(v))}
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '13px',
              }}
            />
          </RePieChart>
        </ResponsiveContainer>
        {centerTotal !== undefined && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-400">
              {centerLabel}
            </span>
            <span className="mt-1 text-lg font-semibold text-slate-900">
              {formatCurrency(centerTotal)}
            </span>
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2">
        {data.map((entry, i) => (
          <div key={entry.name} className="flex items-center gap-2 text-sm text-slate-700">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: entry.color ?? PALETTE[i % PALETTE.length] }}
            />
            <span className="truncate max-w-[180px]">{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
