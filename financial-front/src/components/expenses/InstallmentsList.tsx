import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { expenseService } from '../../services/expenseService';
import { installmentService } from '../../services/installmentService';
import { formatCurrency } from '../../utils/currency';
import { extractApiError } from '../../utils/apiError';
import { ConfirmModal } from '../ui/ConfirmModal';
import type { Installment, InstallmentStatus } from '../../types/expense';

type Props = {
  expenseId: string;
  onUpdated: () => void;
};

function StatusBadge({ status }: { status: InstallmentStatus }) {
  const map: Record<InstallmentStatus, { label: string; className: string }> = {
    PENDING:     { label: 'Pendente',   className: 'bg-slate-100 text-slate-600' },
    PAID:        { label: 'Paga',       className: 'bg-emerald-50 text-emerald-700' },
    ANTICIPATED: { label: 'Antecipada', className: 'bg-indigo-50 text-indigo-700' },
    CANCELLED:   { label: 'Cancelada',  className: 'bg-red-50 text-red-400' },
  };
  const { label, className } = map[status];
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

export function InstallmentsList({ expenseId, onUpdated }: Props) {
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado do date picker inline
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payDate, setPayDate] = useState('');

  // Estado do modal de confirmação de pagamento
  const [confirmPayTarget, setConfirmPayTarget] = useState<Installment | null>(null);

  // Estado do modal de confirmação de desfazer
  const [confirmUnpayTarget, setConfirmUnpayTarget] = useState<Installment | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    expenseService.listInstallments(expenseId)
      .then(setInstallments)
      .catch(() => toast.error('Falha ao carregar parcelas.'))
      .finally(() => setLoading(false));
  }, [expenseId]);

  async function handleConfirmPay() {
    if (!confirmPayTarget) return;
    setSubmitting(true);
    try {
      const updated = await installmentService.markPaid(confirmPayTarget.id, payDate || undefined);
      setInstallments((prev) => prev.map((i) => (i.id === confirmPayTarget.id ? updated : i)));
      setPayingId(null);
      setPayDate('');
      setConfirmPayTarget(null);
      toast.success('Parcela marcada como paga');
      onUpdated();
    } catch (err) {
      setConfirmPayTarget(null);
      toast.error(extractApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmUnpay() {
    if (!confirmUnpayTarget) return;
    setSubmitting(true);
    try {
      const updated = await installmentService.markPending(confirmUnpayTarget.id);
      setInstallments((prev) => prev.map((i) => (i.id === confirmUnpayTarget.id ? updated : i)));
      setConfirmUnpayTarget(null);
      toast.success('Pagamento desfeito');
      onUpdated();
    } catch (err) {
      setConfirmUnpayTarget(null);
      toast.error(extractApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  function formatPaidAt(paidAt: string | null) {
    if (!paidAt) return null;
    return format(parseISO(paidAt.substring(0, 10)), 'dd/MM/yyyy', { locale: ptBR });
  }

  if (loading) {
    return (
      <div className="px-4 py-3 text-sm text-slate-400">Carregando parcelas...</div>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-slate-200 bg-slate-50 mx-2 mb-2 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-white">
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">#</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Vencimento</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Valor</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Status</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Pago em</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Ação</th>
            </tr>
          </thead>
          <tbody>
            {installments.map((inst) => (
              <>
                <tr key={inst.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2 text-slate-500">{inst.installmentNumber}</td>
                  <td className="px-3 py-2 text-slate-700">
                    {format(new Date(inst.dueDate + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                  </td>
                  <td className="px-3 py-2 font-medium text-slate-800">{formatCurrency(inst.amount)}</td>
                  <td className="px-3 py-2"><StatusBadge status={inst.status} /></td>
                  <td className="px-3 py-2 text-slate-500 text-xs">{formatPaidAt(inst.paidAt) ?? '—'}</td>
                  <td className="px-3 py-2 text-right">
                    {inst.status === 'PENDING' && (
                      <button
                        className="rounded px-2.5 py-1 text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                        onClick={() => { setPayingId(inst.id); setPayDate(today); }}
                        disabled={submitting}
                      >
                        Pagar
                      </button>
                    )}
                    {(inst.status === 'PAID' || inst.status === 'ANTICIPATED') && (
                      <button
                        className="rounded px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                        onClick={() => setConfirmUnpayTarget(inst)}
                        disabled={submitting}
                      >
                        Desfazer
                      </button>
                    )}
                  </td>
                </tr>
                {payingId === inst.id && (
                  <tr key={`pay-${inst.id}`} className="bg-emerald-50 border-b border-slate-100">
                    <td colSpan={6} className="px-3 py-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-600">Data do pagamento:</span>
                        <input
                          type="date"
                          value={payDate}
                          max={today}
                          onChange={(e) => setPayDate(e.target.value)}
                          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                        />
                        <button
                          className="rounded px-3 py-1 text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                          onClick={() => setConfirmPayTarget(inst)}
                          disabled={!payDate}
                        >
                          Confirmar
                        </button>
                        <button
                          className="rounded px-3 py-1 text-xs text-slate-500 hover:bg-slate-100"
                          onClick={() => { setPayingId(null); setPayDate(''); }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={!!confirmPayTarget}
        onClose={() => setConfirmPayTarget(null)}
        onConfirm={handleConfirmPay}
        title="Confirmar pagamento"
        variant="primary"
        confirmLabel="Confirmar pagamento"
        cancelLabel="Voltar"
        loading={submitting}
        message={
          confirmPayTarget && (
            <>
              Confirmar pagamento da parcela <strong>#{confirmPayTarget.installmentNumber}</strong>{' '}
              no valor de <strong>{formatCurrency(confirmPayTarget.amount)}</strong>{' '}
              em <strong>{format(new Date(payDate + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}</strong>?
            </>
          )
        }
      />

      <ConfirmModal
        open={!!confirmUnpayTarget}
        onClose={() => setConfirmUnpayTarget(null)}
        onConfirm={handleConfirmUnpay}
        title="Desfazer pagamento"
        confirmLabel="Desfazer"
        cancelLabel="Voltar"
        loading={submitting}
        message={
          confirmUnpayTarget && (
            <>
              Desfazer o pagamento da parcela <strong>#{confirmUnpayTarget.installmentNumber}</strong>{' '}
              no valor de <strong>{formatCurrency(confirmUnpayTarget.amount)}</strong>?{' '}
              A parcela voltará para <em>Pendente</em>.
            </>
          )
        }
      />
    </>
  );
}
