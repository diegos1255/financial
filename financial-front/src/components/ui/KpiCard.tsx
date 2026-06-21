import type { ReactNode } from 'react';

type Variant = 'neutral' | 'positive' | 'negative';

type KpiCardProps = {
  title: string;
  value: string;
  icon: ReactNode;
  variant?: Variant;
  subtitle?: ReactNode;
};

const VARIANT_CLASSES: Record<Variant, string> = {
  neutral: 'text-slate-900',
  positive: 'text-emerald-600',
  negative: 'text-red-600',
};

const ICON_BG: Record<Variant, string> = {
  neutral: 'bg-slate-100 text-slate-600',
  positive: 'bg-emerald-50 text-emerald-600',
  negative: 'bg-red-50 text-red-600',
};

export function KpiCard({ title, value, icon, variant = 'neutral', subtitle }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
          <p className={`mt-2 text-2xl font-semibold tabular-nums ${VARIANT_CLASSES[variant]}`}>
            {value}
          </p>
          {subtitle && <div className="mt-2 text-xs text-slate-500">{subtitle}</div>}
        </div>
        <div className={`shrink-0 rounded-lg p-2 ${ICON_BG[variant]}`}>{icon}</div>
      </div>
    </div>
  );
}
