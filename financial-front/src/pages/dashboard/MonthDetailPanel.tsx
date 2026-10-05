import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { dashboardService } from '../../services/dashboardService';
import { salaryService } from '../../services/salaryService';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { monthLabel } from '../../utils/months';
import { extractApiError } from '../../utils/apiError';
import type { MonthExpenseItem } from '../../types/dashboard';
import type { SalaryPayment } from '../../types/salary';
import { ExpenseTypeBadge } from '../../components/expenses/ExpenseTypeBadge';

export type MonthDetailKind = 'expenses' | 'salary';

type Props = {
  kind: MonthDetailKind;
  year: number;
  month: number;
  mask: (value: string) => string;
  onClose: () => void;
};

type Loaded =
  | { kind: 'expenses'; items: MonthExpenseItem[] }
  | { kind: 'salary'; items: SalaryPayment[] };

// Montado com `key` por mes/tipo: cada abertura comeca carregando.
export function MonthDetailPanel({ kind, year, month, mask, onClose }: Props) {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load: Promise<Loaded> =
      kind === 'expenses'
        ? dashboardService.monthExpenses({ year, month }).then((items) => ({ kind, items }))
        : salaryService.getMonth(year, month).then((m) => ({ kind, items: m.payments }));
    load
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled) setError(extractApiError(err, 'Falha ao carregar lançamentos.'));
      });
    return () => {
      cancelled = true;
    };
  }, [kind, year, month]);

  const title = kind === 'expenses' ? 'Despesas' : 'Recebimentos de salário';
  const total = data ? data.items.reduce((sum, i) => sum + i.amount, 0) : 0;
  const count = data?.items.length ?? 0;

  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/60">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div className="text-sm text-slate-700">
          <span className={`font-semibold ${kind === 'expenses' ? 'text-red-600' : 'text-emerald-600'}`}>{title}</span>{' '}
          de {monthLabel(month).toLowerCase()}/{year}
          {data && (
            <span className="text-slate-500">
              {' · '}
              {count} {count === 1 ? 'lançamento' : 'lançamentos'} · {mask(formatCurrency(total))}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          aria-label="Fechar"
          title="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="max-h-96 overflow-auto">
        {!data && !error && <p className="px-4 py-6 text-center text-sm text-slate-500">Carregando...</p>}
        {error && <p className="px-4 py-6 text-center text-sm text-red-600">{error}</p>}
        {data && count === 0 && (
          <p className="px-4 py-6 text-center text-sm text-slate-500">Nenhum lançamento neste mês.</p>
        )}
        {data?.kind === 'expenses' && count > 0 && (
          <table className="w-full text-sm">
            <tbody>
              {data.items.map((i, idx) => (
                <tr key={`${i.expenseId}-${i.installmentLabel ?? idx}`} className="border-b border-slate-100 last:border-0">
                  <td className="whitespace-nowrap px-4 py-2 text-slate-500">{i.date ? formatDate(i.date) : 'Mensal'}</td>
                  <td className="px-4 py-2 text-slate-800">
                    {i.description}
                    {i.installmentLabel && <span className="ml-1 text-xs text-slate-400">({i.installmentLabel})</span>}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: i.categoryColor ?? '#94a3b8' }} />
                      {i.categoryName}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <ExpenseTypeBadge type={i.type} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right font-medium tabular-nums text-slate-900">
                    {mask(formatCurrency(i.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {data?.kind === 'salary' && count > 0 && (
          <table className="w-full text-sm">
            <tbody>
              {data.items.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0">
                  <td className="whitespace-nowrap px-4 py-2 text-slate-500">{formatDate(p.paymentDate)}</td>
                  <td className="px-4 py-2 text-slate-800">{p.description ?? '—'}</td>
                  <td className="px-4 py-2 text-slate-600">{p.bankAccountName}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-right font-medium tabular-nums text-slate-900">
                    {mask(formatCurrency(p.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
