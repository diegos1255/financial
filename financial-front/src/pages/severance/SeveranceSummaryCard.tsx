import { Pencil } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { FillBar } from '../../components/ui/FillBar';
import { AnimatedCurrency } from '../../components/ui/AnimatedCurrency';
import { formatCurrency } from '../../utils/currency';
import type { Severance } from '../../types/severance';
import { progressTone } from '../../utils/progressTone';

type Props = {
  data: Severance | null;
  loading: boolean;
  onEditTotal: () => void;
};

export function SeveranceSummaryCard({ data, loading, onEditTotal }: Props) {
  if (loading || !data) {
    return <div className="mb-4 h-32 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />;
  }

  const total = data.totalAmount;
  const received = data.receivedAmount;
  const remaining = data.remainingAmount;
  const overpaid = remaining !== null && remaining < 0;
  const percent = total ? Math.min(100, Math.round((received / total) * 100)) : 0;
  const tone = progressTone(received, total);
  const countLabel = data.paymentsCount === 1 ? '1 recebimento' : `${data.paymentsCount} recebimentos`;

  return (
    <div className="relative mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-teal-50 via-white via-45% to-white p-5 pl-6 shadow-soft">
      <span className="absolute inset-y-0 left-0 w-1 bg-teal-500" aria-hidden />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Total da rescisão</div>
          {total !== null ? (
            <div className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{formatCurrency(total)}</div>
          ) : (
            <div className="mt-1 text-sm italic text-slate-400">não informado</div>
          )}
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Recebido</div>
          <div className={`mt-1 text-xl font-semibold tabular-nums ${tone.text}`}><AnimatedCurrency value={received} /></div>
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
        {total !== null && (
          <div className="flex flex-1 items-center gap-3" style={{ minWidth: '12rem' }}>
            <FillBar percent={percent} barClass={tone.bar} />
            <span className="text-sm tabular-nums text-slate-600">{percent}%</span>
          </div>
        )}
        <span className="text-sm text-slate-500">{countLabel}</span>
        <Button variant="ghost" onClick={onEditTotal}>
          <Pencil className="h-4 w-4" />
          {total !== null ? 'Editar total' : 'Informar total'}
        </Button>
      </div>
    </div>
  );
}
