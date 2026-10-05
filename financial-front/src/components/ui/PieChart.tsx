import { useEffect, useState } from 'react';
import { Cell, Pie, PieChart as RePieChart, ResponsiveContainer } from 'recharts';
import type { PieSectorDataItem } from 'recharts';
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
  /** Se fornecido, sobrescreve o texto do centro (usado pra mascarar valores). */
  centerValueOverride?: string;
  emptyMessage?: string;
  onSliceClick?: (categoryId: string, categoryName: string) => void;
  /** Mascara o valor do tooltip quando os valores estao ocultos (olhinho). */
  maskValue?: (value: string) => string;
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

type HoveredSlice = { name: string; value: number; color: string; x: number; y: number; left: boolean };

const RADIAN = Math.PI / 180;
const TOOLTIP_GAP = 12;

// Tooltip proprio, ancorado do lado de FORA da fatia (na direcao dela):
// o do Recharts seguia o mouse e cobria o total no centro do anel.
function hoveredFrom(sector: PieSectorDataItem, color: string): HoveredSlice {
  const angle = -(sector.midAngle ?? 0) * RADIAN;
  const radius = sector.outerRadius + TOOLTIP_GAP;
  const x = sector.cx + radius * Math.cos(angle);
  return {
    name: String(sector.name ?? ''),
    value: Number(sector.value),
    color,
    x,
    y: sector.cy + radius * Math.sin(angle),
    left: x < sector.cx,
  };
}

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
  centerValueOverride,
  emptyMessage = 'Sem dados para o período.',
  onSliceClick,
  maskValue = (v) => v,
}: PieChartProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [hovered, setHovered] = useState<HoveredSlice | null>(null);

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
              onMouseEnter={(sector, index) =>
                setHovered(hoveredFrom(sector, data[index]?.color ?? PALETTE[index % PALETTE.length]))
              }
              onMouseLeave={() => setHovered(null)}
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
          </RePieChart>
        </ResponsiveContainer>
        {hovered && (
          <div
            className="pointer-events-none absolute z-10 flex items-center gap-2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] text-slate-700 shadow-md"
            style={{
              left: hovered.x,
              top: hovered.y,
              transform: `translate(${hovered.left ? '-100%' : '0'}, -50%)`,
            }}
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: hovered.color }} />
            <span>{hovered.name}</span>
            <span className="font-semibold tabular-nums text-slate-900">{maskValue(formatCurrency(hovered.value))}</span>
          </div>
        )}
        {centerTotal !== undefined && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-400">
              {centerLabel}
            </span>
            <span className="mt-1 text-lg font-semibold text-slate-900">
              {centerValueOverride ?? formatCurrency(centerTotal)}
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
