import type { ReactNode } from 'react';

type Variant = 'neutral' | 'positive' | 'negative';
export type KpiAccent = 'emerald' | 'red' | 'amber' | 'indigo' | 'slate';

type KpiCardProps = {
  title: string;
  value: ReactNode;
  icon: ReactNode;
  variant?: Variant;
  /** Cor de identidade do card (faixa lateral, icone e toque no fundo) — WORK-32, D-8. */
  accent?: KpiAccent;
  subtitle?: ReactNode;
};

const VARIANT_CLASSES: Record<Variant, string> = {
  neutral: 'text-slate-900',
  positive: 'text-emerald-600',
  negative: 'text-red-600',
};

// Classes completas (sem interpolacao) para o Tailwind gerar todas.
const ACCENT_CLASSES: Record<KpiAccent, { stripe: string; icon: string; bg: string }> = {
  emerald: { stripe: 'bg-emerald-500', icon: 'bg-emerald-100 text-emerald-600', bg: 'from-emerald-50' },
  red: { stripe: 'bg-red-500', icon: 'bg-red-100 text-red-600', bg: 'from-red-50' },
  amber: { stripe: 'bg-amber-500', icon: 'bg-amber-100 text-amber-600', bg: 'from-amber-50' },
  indigo: { stripe: 'bg-indigo-500', icon: 'bg-indigo-100 text-indigo-600', bg: 'from-indigo-50' },
  slate: { stripe: 'bg-slate-300', icon: 'bg-slate-100 text-slate-600', bg: 'from-slate-50' },
};

export function KpiCard({ title, value, icon, variant = 'neutral', accent = 'slate', subtitle }: KpiCardProps) {
  const a = ACCENT_CLASSES[accent];
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br ${a.bg} via-white via-45% to-white p-5 pl-6 shadow-soft transition-shadow hover:shadow-md`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${a.stripe}`} aria-hidden />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{title}</p>
          <p className={`mt-2 text-2xl font-semibold tabular-nums ${VARIANT_CLASSES[variant]}`}>
            {value}
          </p>
          {subtitle && <div className="mt-2 text-xs text-slate-500">{subtitle}</div>}
        </div>
        <div className={`shrink-0 rounded-xl p-2.5 ${a.icon}`}>{icon}</div>
      </div>
    </div>
  );
}
