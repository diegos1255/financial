import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Ban, ChevronDown, ChevronUp, Pencil, Plus, Search, SlidersHorizontal, Wallet, X } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { Pagination } from '../../components/ui/Pagination';
import { Select } from '../../components/ui/Select';
import { InstallmentsList } from '../../components/expenses/InstallmentsList';
import { ExpenseFormModal } from './ExpenseFormModal';
import { ExpenseUpdateModal } from './ExpenseUpdateModal';
import {
  DEFAULT_FILTERS,
  ExpenseFiltersModal,
  countActiveFilters,
  type ExpenseFilters,
} from './ExpenseFiltersModal';
import { expenseService } from '../../services/expenseService';
import { dashboardService } from '../../services/dashboardService';
import { categoryService } from '../../services/categoryService';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { MONTHS, yearRange } from '../../utils/months';
import { extractApiError } from '../../utils/apiError';
import type { Category } from '../../types/category';
import type { Expense, ExpenseStatus, Installment } from '../../types/expense';

const NOW = new Date();
const YEARS = yearRange(NOW.getFullYear() - 5, NOW.getFullYear() + 1);
const PAGE_SIZE = 10;

function installmentProgress(installments: Installment[] | null) {
  if (!installments || installments.length === 0) return null;
  const paid = installments.filter((i) => i.status === 'PAID' || i.status === 'ANTICIPATED').length;
  return { paid, total: installments.length };
}

export function ExpensesPage() {
  const [items, setItems] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<number | ''>(NOW.getFullYear());
  const [month, setMonth] = useState<number | ''>(NOW.getMonth() + 1);
  const [status, setStatus] = useState<ExpenseStatus | ''>('ACTIVE');
  const [createOpen, setCreateOpen] = useState(false);
  const [updateTarget, setUpdateTarget] = useState<Expense | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Expense | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [monthTotal, setMonthTotal] = useState<number | null>(null);
  const [filters, setFilters] = useState<ExpenseFilters>(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    categoryService.listAll().then(setCategories).catch(() => setCategories([]));
  }, []);

  async function reload() {
    setLoading(true);
    try {
      const list = await expenseService.list({
        year: year === '' ? undefined : year,
        month: month === '' ? undefined : month,
        status: status === '' ? undefined : status,
      });
      setItems(list);

      if (year !== '' && month !== '') {
        try {
          const balance = await dashboardService.balance({ year, month });
          setMonthTotal(balance.totalExpenses);
        } catch {
          setMonthTotal(null);
        }
      } else {
        setMonthTotal(null);
      }
    } catch (err) {
      toast.error(extractApiError(err, 'Falha ao carregar despesas.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPage(0);
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, status]);

  async function handleConfirmCancel() {
    if (!cancelTarget) return;
    setCancelLoading(true);
    try {
      await expenseService.cancel(cancelTarget.id);
      toast.success('Despesa cancelada');
      setCancelTarget(null);
      reload();
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setCancelLoading(false);
    }
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    setExpandedId(null);
  }

  const filteredItems = useMemo(() => {
    let out = items;
    if (filters.expenseType !== '') {
      out = out.filter((e) => e.expenseType === filters.expenseType);
    }
    if (filters.categoryId !== '') {
      out = out.filter((e) => e.category.id === filters.categoryId);
    }
    if (filters.purchaseFrom !== '') {
      out = out.filter((e) => e.purchaseDate >= filters.purchaseFrom);
    }
    if (filters.purchaseTo !== '') {
      out = out.filter((e) => e.purchaseDate <= filters.purchaseTo);
    }
    const q = searchText.trim().toLowerCase();
    if (q !== '') {
      out = out.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          e.category.name.toLowerCase().includes(q),
      );
    }
    // Ordenacao (nao mutar array original)
    const sorted = [...out];
    if (filters.sort === 'AMOUNT_DESC') {
      sorted.sort((a, b) => b.totalAmount - a.totalAmount);
    } else if (filters.sort === 'AMOUNT_ASC') {
      sorted.sort((a, b) => a.totalAmount - b.totalAmount);
    } else {
      // PURCHASE_DATE_DESC (padrao). API ja retorna nessa ordem, mas
      // garantimos aqui caso o backend mude.
      sorted.sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate));
    }
    return sorted;
  }, [items, filters, searchText]);

  const activeFilters = countActiveFilters(filters);
  const filteredTotal = useMemo(
    () => filteredItems.reduce((sum, e) => sum + e.totalAmount, 0),
    [filteredItems],
  );
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageItems = filteredItems.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const showMonthTotal = monthTotal !== null && status !== 'CANCELLED';

  useEffect(() => {
    setPage(0);
    setExpandedId(null);
  }, [filters, searchText]);

  return (
    <div>
      <PageHeader
        title="Despesas"
        subtitle="Fixas, parceladas e variáveis"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Nova
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="w-44">
          <Select value={month} onChange={(e) => setMonth(e.target.value === '' ? '' : Number(e.target.value))}>
            <option value="">Mês (todos)</option>
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-32">
          <Select value={year} onChange={(e) => setYear(e.target.value === '' ? '' : Number(e.target.value))}>
            <option value="">Ano (todos)</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-40">
          <Select value={status} onChange={(e) => setStatus(e.target.value as ExpenseStatus | '')}>
            <option value="">Todos status</option>
            <option value="ACTIVE">Ativas</option>
            <option value="CANCELLED">Canceladas</option>
          </Select>
        </div>
        {showMonthTotal && (
          <div className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
            <Wallet className="h-4 w-4 text-emerald-500" />
            <span className="text-emerald-700">Total do mês:</span>
            <span className="font-semibold text-emerald-800 tabular-nums">
              {formatCurrency(monthTotal!)}
            </span>
          </div>
        )}

        {activeFilters > 0 && (
          <div className="inline-flex items-center gap-2 rounded-md border border-accent/30 bg-accent-soft px-3 py-2 text-sm">
            <Wallet className="h-4 w-4 text-accent" />
            <span className="text-accent">Total filtrado:</span>
            <span className="font-semibold text-accent tabular-nums">
              {formatCurrency(filteredTotal)}
            </span>
            <span className="text-accent/70 text-xs">
              ({filteredItems.length} de {items.length})
            </span>
          </div>
        )}

        <div className="inline-flex items-center gap-2">
          <Button onClick={() => setFiltersOpen(true)}>
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
            {activeFilters > 0 && (
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/25 px-1.5 text-[11px] font-semibold text-white">
                {activeFilters}
              </span>
            )}
          </Button>

          {activeFilters > 0 && (
            <button
              type="button"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              title="Remover todos os filtros aplicados"
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      <div className="mb-3 max-w-md">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Buscar por descrição ou categoria..."
            className="w-full rounded-md border border-slate-300 bg-white pl-9 pr-9 py-2 text-sm text-slate-900 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors placeholder:text-slate-400"
          />
          {searchText && (
            <button
              type="button"
              onClick={() => setSearchText('')}
              aria-label="Limpar busca"
              title="Limpar busca"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-soft overflow-hidden">
        <Table<Expense>
          rowKey={(r) => r.id}
          loading={loading}
          empty={
            searchText.trim() !== '' && activeFilters > 0
              ? `Nada combina com "${searchText.trim()}" + os filtros aplicados.`
              : searchText.trim() !== ''
                ? `Não encontramos nada para "${searchText.trim()}".`
                : activeFilters > 0
                  ? 'Nenhuma despesa para os filtros aplicados.'
                  : 'Nenhuma despesa para o período selecionado.'
          }
          expandedRowKey={expandedId}
          expandedRowContent={(r) => (
            <InstallmentsList expenseId={r.id} onUpdated={reload} />
          )}
          columns={[
            { header: 'Descrição', accessor: 'description', align: 'left' },
            {
              header: 'Tipo',
              align: 'center',
              render: (r) =>
                r.expenseType === 'FIXED' ? (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">Fixa</span>
                ) : r.expenseType === 'INSTALLMENT' ? (
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
                    {r.installmentsCount}×
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">Variável</span>
                ),
            },
            {
              header: 'Parcelas',
              align: 'center',
              render: (r) => {
                if (r.expenseType !== 'INSTALLMENT') return null;
                const progress = installmentProgress(r.installments);
                if (!progress) return null;
                const allPaid = progress.paid === progress.total;
                return (
                  <span className={`text-xs font-medium ${allPaid ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {progress.paid}/{progress.total} pagas
                  </span>
                );
              },
            },
            { header: 'Categoria', align: 'left', render: (r) => r.category.name },
            { header: 'Conta', align: 'left', render: (r) => r.bankAccount.name },
            { header: 'Compra', align: 'center', render: (r) => formatDate(r.purchaseDate) },
            { header: 'Total', align: 'right', render: (r) => formatCurrency(r.totalAmount) },
            {
              header: 'Status',
              align: 'center',
              render: (r) =>
                r.status === 'ACTIVE' ? (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">Ativa</span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Cancelada</span>
                ),
            },
            {
              header: 'Ações',
              align: 'right',
              width: '140px',
              render: (r) => (
                <div className="flex justify-end gap-1">
                  {r.expenseType === 'INSTALLMENT' && r.status === 'ACTIVE' && (
                    <button
                      className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                      onClick={() => toggleExpand(r.id)}
                      title={expandedId === r.id ? 'Fechar parcelas' : 'Ver parcelas'}
                    >
                      {expandedId === r.id
                        ? <ChevronUp className="h-4 w-4" />
                        : <ChevronDown className="h-4 w-4" />
                      }
                    </button>
                  )}
                  {r.status === 'ACTIVE' && (
                    <>
                      <button
                        className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-accent transition-colors"
                        onClick={() => setUpdateTarget(r)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                        onClick={() => setCancelTarget(r)}
                        title="Cancelar despesa"
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              ),
            },
          ]}
          data={pageItems}
        />

        <div className="px-3 border-t border-slate-100">
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            totalElements={items.length}
            size={PAGE_SIZE}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      <ExpenseFiltersModal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        current={filters}
        onApply={setFilters}
        categories={categories}
      />

      <ExpenseFormModal open={createOpen} onClose={() => setCreateOpen(false)} onSaved={reload} />
      <ExpenseUpdateModal
        open={!!updateTarget}
        onClose={() => setUpdateTarget(null)}
        onSaved={reload}
        editing={updateTarget}
      />
      <ConfirmModal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleConfirmCancel}
        title="Cancelar despesa"
        message={
          cancelTarget && (
            <>
              Cancelar <strong>{cancelTarget.description}</strong>?{' '}
              {cancelTarget.expenseType === 'INSTALLMENT' && (
                <>As parcelas com status <em>PENDING</em> também serão canceladas em cascata. Parcelas
                  pagas permanecem.</>
              )}
            </>
          )
        }
        confirmLabel="Cancelar despesa"
        cancelLabel="Voltar"
        loading={cancelLoading}
      />
    </div>
  );
}
