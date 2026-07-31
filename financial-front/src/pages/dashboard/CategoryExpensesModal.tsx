import { useEffect, useMemo, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
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

const PAGE_SIZE = 8;

export function CategoryExpensesModal({ open, onClose, categoryName, categoryId, year, month }: Props) {
  const [items, setItems] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<string>('');
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setFilterDate('');
    setPage(0);
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

  const filteredItems = useMemo(() => {
    if (!filterDate) return items;
    return items.filter((i) => i.purchaseDate.startsWith(filterDate));
  }, [items, filterDate]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageItems = filteredItems.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const total = filteredItems.reduce((sum, i) => sum + i.totalAmount, 0);

  function handleFilterChange(next: string) {
    setFilterDate(next);
    setPage(0);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={<span className="text-accent">{`${categoryName} — ${monthLabel} ${year}`}</span>}
    >
      <div className="min-h-[420px] flex flex-col">
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
          <>
            <div className="mb-3 flex items-center gap-2">
              <label htmlFor="filter-date" className="text-xs font-medium text-slate-600">
                Filtrar por dia:
              </label>
              <input
                id="filter-date"
                type="date"
                value={filterDate}
                onChange={(e) => handleFilterChange(e.target.value)}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
              {filterDate && (
                <button
                  type="button"
                  onClick={() => handleFilterChange('')}
                  className="text-xs text-slate-500 hover:text-slate-700 hover:underline"
                >
                  Limpar
                </button>
              )}
            </div>

            <div className="flex-1">
              {filteredItems.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  Nenhuma despesa nesse dia.
                </p>
              ) : (
                <>
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-slate-100">
                      {pageItems.map((item) => (
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

                  <Pagination
                    page={currentPage}
                    totalPages={totalPages}
                    totalElements={filteredItems.length}
                    size={PAGE_SIZE}
                    onPageChange={setPage}
                  />
                </>
              )}
            </div>

            <div className="mt-2 border-t border-slate-200 pt-3 flex justify-between text-sm font-semibold text-slate-800">
              <span>Total{filterDate ? ' (dia)' : ''}</span>
              <span className="tabular-nums">{formatCurrency(total)}</span>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
