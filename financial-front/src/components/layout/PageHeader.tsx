import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export type PageTone = 'indigo' | 'blue' | 'emerald' | 'red' | 'amber' | 'violet' | 'teal';

// Classes completas (sem interpolacao) para o Tailwind gerar todas.
const TONE_CLASSES: Record<PageTone, string> = {
  indigo: 'bg-indigo-100 text-indigo-600',
  blue: 'bg-blue-100 text-blue-600',
  emerald: 'bg-emerald-100 text-emerald-600',
  red: 'bg-red-100 text-red-600',
  amber: 'bg-amber-100 text-amber-600',
  violet: 'bg-violet-100 text-violet-600',
  teal: 'bg-teal-100 text-teal-600',
};

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Mesmo icone do menu, num quadrado colorido (WORK-33). */
  icon?: LucideIcon;
  tone?: PageTone;
};

export function PageHeader({ title, subtitle, actions, icon: Icon, tone = 'indigo' }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        {Icon && (
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${TONE_CLASSES[tone]}`}>
            <Icon className="h-5 w-5" />
          </span>
        )}
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
