import { FileText, Pencil } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { formatCurrency } from '../../utils/currency';
import type { SalaryMonth } from '../../types/salary';

// Faixas fixas do valor recebido (WORK-30, D-5) — independem do total da NF.
function receivedTone(received: number) {
  if (received <= 5000) return { text: 'text-red-600', bar: 'bg-red-500' };
  if (received <= 10000) return { text: 'text-orange-600', bar: 'bg-orange-500' };
  return { text: 'text-emerald-600', bar: 'bg-emerald-500' };
}

type Props = {
  data: SalaryMonth | null;
  loading: boolean;
  onEditTotal: () => void;
};

export function SalarySummaryCard({ data, loading, onEditTotal }: Props) {
  if (loading || !data) {
    return <div className="mb-4 h-32 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />;
  }

  const expected = data.expectedAmount;
  const received = data.receivedAmount;
  const remaining = data.remainingAmount;
  const overpaid = remaining !== null && remaining < 0;
  const percent = expected ? Math.min(100, Math.round((received / expected) * 100)) : 0;
  const tone = receivedTone(received);

  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Total a receber</div>
          {expected !== null ? (
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-semibold tabular-nums text-slate-900">{formatCurrency(expected)}</span>
              {data.expectedFromInvoice && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600" title="Total vindo da Nota Fiscal do mês">
                  <FileText className="h-3.5 w-3.5" />
                  da NF
                </span>
              )}
            </div>
          ) : (
            <div className="mt-1 text-sm italic text-slate-400">não informado</div>
          )}
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Recebido</div>
          <div className={`mt-1 text-xl font-semibold tabular-nums ${tone.text}`}>{formatCurrency(received)}</div>
        </div>
        {remaining !== null && (
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {overpaid ? 'Excedente' : 'Falta'}
            </div>
            <div className={`mt-1 text-xl font-semibold tabular-nums ${overpaid ? 'text-amber-600' : 'text-accent'}`}>
              {formatCurrency(Math.abs(remaining))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {expected !== null && (
          <div className="flex flex-1 items-center gap-3" style={{ minWidth: '12rem' }}>
            <div
              className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={`h-full rounded-full transition-all ${tone.bar}`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="text-sm tabular-nums text-slate-600">{percent}%</span>
          </div>
        )}
        <Button variant="ghost" onClick={onEditTotal}>
          <Pencil className="h-4 w-4" />
          {expected !== null ? 'Editar total' : 'Informar total'}
        </Button>
      </div>
    </div>
  );
}
