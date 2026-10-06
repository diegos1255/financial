import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Trash2 } from 'lucide-react';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { investmentService } from '../../services/investmentService';
import { extractApiError } from '../../utils/apiError';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { INCOME_TYPE_LABELS } from '../../types/investment';
import type { Investment, InvestmentIncome, InvestmentTransaction } from '../../types/investment';
import { todayLocal } from './localDate';

type Props = {
  investment: Investment;
  /** Algo mudou (quantidade recalculada): a tela recarrega a lista. */
  onChanged: () => void;
};

type Removing = { kind: 'tx'; item: InvestmentTransaction } | { kind: 'income'; item: InvestmentIncome };

const TX_LABELS: Record<InvestmentTransaction['type'], { label: string; className: string }> = {
  INITIAL: { label: 'Saldo inicial', className: 'bg-slate-100 text-slate-600' },
  BUY: { label: 'Compra', className: 'bg-emerald-50 text-emerald-700' },
  SELL: { label: 'Venda', className: 'bg-red-50 text-red-700' },
};

/** Historico de um ativo (WORK-36): movimentacoes e proventos, com exclusao. Montado com `key` por ativo. */
export function InvestmentHistoryPanel({ investment, onChanged }: Props) {
  const [transactions, setTransactions] = useState<InvestmentTransaction[] | null>(null);
  const [incomes, setIncomes] = useState<InvestmentIncome[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Removing | null>(null);
  const [removingLoading, setRemovingLoading] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([investmentService.listTransactions(investment.id), investmentService.listIncomes(investment.id)])
      .then(([tx, inc]) => {
        if (cancelled) return;
        setTransactions([...tx].reverse());
        setIncomes(inc);
      })
      .catch((err) => {
        if (!cancelled) setError(extractApiError(err, 'Falha ao carregar histórico.'));
      });
    return () => {
      cancelled = true;
    };
  }, [investment.id, version]);

  async function confirmRemove() {
    if (!removing) return;
    setRemovingLoading(true);
    try {
      if (removing.kind === 'tx') await investmentService.removeTransaction(removing.item.id);
      else await investmentService.removeIncome(removing.item.id);
      toast.success('Lançamento excluído');
      setRemoving(null);
      setVersion((v) => v + 1);
      onChanged();
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setRemovingLoading(false);
    }
  }

  const today = todayLocal();
  const totalIncome = incomes.filter((i) => i.paymentDate <= today).reduce((s, i) => s + i.amount, 0);
  const totalPending = incomes.filter((i) => i.paymentDate > today).reduce((s, i) => s + i.amount, 0);

  return (
    <div className="grid gap-4 px-4 py-4 lg:grid-cols-2">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Movimentações {transactions && `(${transactions.length})`}
        </h3>
        {!transactions ? (
          <p className="text-sm text-slate-400">Carregando...</p>
        ) : (
          <div className="max-h-72 overflow-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="whitespace-nowrap px-3 py-1.5 text-slate-500">{formatDate(t.tradeDate)}</td>
                    <td className="px-3 py-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TX_LABELS[t.type].className}`}>{TX_LABELS[t.type].label}</span>
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{t.quantity} cotas</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-slate-500">{t.unitPrice ? formatCurrency(t.unitPrice) : '—'}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums font-medium text-slate-800">{t.total ? formatCurrency(t.total) : '—'}</td>
                    <td className="px-2 py-1.5 text-right">
                      {t.type !== 'INITIAL' && (
                        <button className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Excluir" onClick={() => setRemoving({ kind: 'tx', item: t })}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Proventos ({incomes.length}) · <span className="text-emerald-600">{formatCurrency(totalIncome)}</span>
          {totalPending > 0 && <span className="font-normal normal-case text-emerald-500"> + {formatCurrency(totalPending)} a receber</span>}
        </h3>
        {incomes.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhum provento registrado.</p>
        ) : (
          <div className="max-h-72 overflow-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {incomes.map((i) => (
                  <tr key={i.id}>
                    <td className="whitespace-nowrap px-3 py-1.5 text-slate-500">{formatDate(i.paymentDate)}</td>
                    <td className="px-3 py-1.5 text-slate-600">
                      {INCOME_TYPE_LABELS[i.type]}
                      {i.paymentDate > today && (
                        <span className="ml-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600 ring-1 ring-emerald-200">a receber</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-slate-500">
                      {i.quantity == null
                        ? ''
                        : i.unitValue == null
                          ? `${i.quantity} cotas`
                          : `${i.quantity} × ${i.unitValue.toLocaleString('pt-BR', { maximumFractionDigits: 6 })}`}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums font-medium text-emerald-700">{formatCurrency(i.amount)}</td>
                    <td className="px-2 py-1.5 text-right">
                      <button className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Excluir" onClick={() => setRemoving({ kind: 'income', item: i })}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <ConfirmModal
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={confirmRemove}
        title="Excluir lançamento"
        message={
          removing?.kind === 'tx'
            ? 'Excluir esta movimentação? A quantidade de cotas será recalculada.'
            : 'Excluir este provento?'
        }
        confirmLabel="Excluir"
        loading={removingLoading}
      />
    </div>
  );
}
