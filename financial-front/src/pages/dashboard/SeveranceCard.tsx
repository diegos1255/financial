import { Handshake } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { severanceTone } from '../severance/severanceTone';
import type { Severance } from '../../types/severance';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { SECTION_CARD_CLASSES } from '../../components/ui/sectionCard';

type Props = {
  severance: Severance;
  mask: (value: string) => string;
};

// Acompanhamento da rescisao (WORK-31, D-6). Nao entra no Salario nem no Saldo.
export function SeveranceCard({ severance, mask }: Props) {
  const total = severance.totalAmount ?? 0;
  const received = severance.receivedAmount;
  const percent = total ? Math.min(100, Math.round((received / total) * 100)) : 0;
  const tone = severanceTone(received);

  return (
    <div className={SECTION_CARD_CLASSES}>
      <SectionTitle icon={<Handshake className="h-4 w-4" />} title="Rescisão" tone="teal" />
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div>
          <div className="text-xs text-slate-500">Total a receber</div>
          <div className="text-lg font-semibold tabular-nums text-slate-900">{mask(formatCurrency(total))}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">Recebido</div>
          <div className={`text-lg font-semibold tabular-nums ${tone.text}`}>{mask(formatCurrency(received))}</div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className={`h-full rounded-full transition-all ${tone.bar}`} style={{ width: `${percent}%` }} />
        </div>
        <span className="text-sm tabular-nums text-slate-600">{percent}%</span>
      </div>
    </div>
  );
}
