import { useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { expenseService } from '../../services/expenseService';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { extractApiError } from '../../utils/apiError';
import type { Expense } from '../../types/expense';
import { MONTHS } from '../../utils/months';

type Props = {
  open: boolean;
  onClose: () => void;
  categoryName: string;
  categoryId: string;
  year: number;
  month: number;
};

export function CategoryExpensesModal({ open, onClose, categoryName, categoryId, year, month }: Props) {
  const [items, setItems] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    expenseService
      .list({ categoryId, year, month, status: 'ACTIVE' })
      .then((data) => {
        const sorted = [...data].sort(
          (a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
        );
        setItems(sorted);
      })
      .catch((err) => setError(extractApiError(err, 'Falha ao carregar despesas.')))
      .finally(() => setLoading(false));
  }, [open, categoryId, year, month]);

  const monthLabel = MONTHS.find((m) => m.value === month)?.label ?? String(month);
  const total = items.reduce((sum, i) => sum + i.totalAmount, 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${categoryName} — ${monthLabel} ${year}`}
    >
      {loading && (
        <p className="py-6 text-center text-sm text-slate-500">Carregando...</p>
      )}
      {error && (
        <p className="py-4 text-center text-sm text-red-600">{error}</p>
      )}
      {!loading && !error && items.length === 0 && (
        <p className="py-6 text-center text-sm text-slate-500">Nenhuma despesa encontrada.</p>
      )}
      {!loading && !error && items.length > 0 && (
        <div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="py-2 pr-4 text-slate-800">{item.description}</td>
                  <td className="py-2 pr-4 text-slate-500 whitespace-nowrap">{formatDate(item.purchaseDate)}</td>
                  <td className="py-2 text-right font-medium tabular-nums text-slate-800 whitespace-nowrap">
                    {formatCurrency(item.totalAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 border-t border-slate-200 pt-3 flex justify-between text-sm font-semibold text-slate-800">
            <span>Total</span>
            <span className="tabular-nums">{formatCurrency(total)}</span>
          </div>
        </div>
      )}
    </Modal>
  );
}
