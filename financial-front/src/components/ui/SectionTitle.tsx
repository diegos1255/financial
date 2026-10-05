import type { ReactNode } from 'react';

export type SectionTone = 'indigo' | 'blue' | 'amber' | 'emerald' | 'red';

// Classes completas (sem interpolacao) para o Tailwind gerar todas.
const TONE_CLASSES: Record<SectionTone, string> = {
  indigo: 'bg-indigo-100 text-indigo-600',
  blue: 'bg-blue-100 text-blue-600',
  amber: 'bg-amber-100 text-amber-600',
  emerald: 'bg-emerald-100 text-emerald-600',
  red: 'bg-red-100 text-red-600',
};

type Props = {
  icon: ReactNode;
  title: string;
  tone: SectionTone;
  right?: ReactNode;
};

/** Titulo padrao dos cards de secao do dashboard (WORK-32, D-8). */
export function SectionTitle({ icon, title, tone, right }: Props) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2.5">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${TONE_CLASSES[tone]}`}>{icon}</span>
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      </div>
      {right}
    </div>
  );
}
