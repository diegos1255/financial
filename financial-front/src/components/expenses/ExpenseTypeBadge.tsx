import type { ExpenseType } from '../../types/expense';

// Mesmas cores em todo o sistema (WORK-33): Fixa azul, Parcela ambar, Variavel violeta.
const STYLES: Record<ExpenseType, { label: string; className: string }> = {
  FIXED: { label: 'Fixa', className: 'bg-blue-50 text-blue-700 ring-blue-200' },
  INSTALLMENT: { label: 'Parcela', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
  VARIABLE: { label: 'Variável', className: 'bg-violet-50 text-violet-700 ring-violet-200' },
};

export function ExpenseTypeBadge({ type, label }: { type: ExpenseType; label?: string }) {
  const style = STYLES[type];
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${style.className}`}>
      {label ?? style.label}
    </span>
  );
}
