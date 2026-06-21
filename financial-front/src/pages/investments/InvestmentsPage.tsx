import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Pencil, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { Pagination } from '../../components/ui/Pagination';
import { InvestmentFormModal } from './InvestmentFormModal';
import { investmentService } from '../../services/investmentService';
import { formatCurrency } from '../../utils/currency';
import { extractApiError } from '../../utils/apiError';
import type { Investment, InvestmentPortfolioItem } from '../../types/investment';

const PAGE_SIZE = 10;

export function InvestmentsPage() {
  const [allItems, setAllItems] = useState<Investment[]>([]);
  const [portfolioMap, setPortfolioMap] = useState<Record<string, InvestmentPortfolioItem>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Investment | null>(null);
  const [removing, setRemoving] = useState<Investment | null>(null);
  const [removingLoading, setRemovingLoading] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      const [listResult, portfolio] = await Promise.all([
        investmentService.list({ includeInactive: true, page: 0, size: 1000 }),
        investmentService.getPortfolio().catch(() => null),
      ]);
      setAllItems(listResult.content);
      if (portfolio) {
        const map: Record<string, InvestmentPortfolioItem> = {};
        portfolio.items.forEach((item) => { map[item.ticker] = item; });
        setPortfolioMap(map);
      }
    } catch (err) {
      toast.error(extractApiError(err, 'Falha ao carregar investimentos.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(); }, []);

  const filtered = useMemo(() => {
    const lower = q.trim().toLowerCase();
    return allItems.filter((item) => {
      if (!includeInactive && !item.active) return false;
      if (lower) {
        return item.ticker.toLowerCase().includes(lower) ||
          (item.description ?? '').toLowerCase().includes(lower);
      }
      return true;
    });
  }, [allItems, q, includeInactive]);

  useEffect(() => { setCurrentPage(0); }, [q, includeInactive]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageItems = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  async function handleConfirmRemove() {
    if (!removing) return;
    setRemovingLoading(true);
    try {
      await investmentService.remove(removing.id);
      toast.success('Investimento desativado');
      setRemoving(null);
      reload();
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setRemovingLoading(false);
    }
  }

  async function handleReactivate(item: Investment) {
    try {
      await investmentService.setActive(item.id, true);
      toast.success('Investimento reativado');
      reload();
    } catch (err) {
      toast.error(extractApiError(err));
    }
  }

  return (
    <div>
      <PageHeader
        title="Investimentos"
        actions={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" />
            Novo
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por ticker ou descrição..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="rounded border-slate-300 text-accent focus:ring-accent"
          />
          Mostrar inativos
        </label>
      </div>

      <Table<Investment>
        rowKey={(r) => r.id}
        loading={loading}
        empty="Nenhum investimento cadastrado."
        columns={[
          {
            header: 'Ticker',
            render: (r) => (
              <span className={`font-medium tabular-nums${r.active ? '' : ' text-slate-400 line-through'}`}>
                {r.ticker}
                {!r.active && <span className="ml-2 text-xs font-normal text-red-400">(inativo)</span>}
              </span>
            ),
          },
          { header: 'Qtd.', accessor: 'quantity', align: 'right' },
          {
            header: 'Preço atual',
            align: 'right',
            render: (r) => {
              const p = portfolioMap[r.ticker];
              if (!r.active || !p || p.priceUnavailable) return <span className="text-slate-400">—</span>;
              return <span className="tabular-nums">{formatCurrency(p.currentPrice!)}</span>;
            },
          },
          {
            header: 'Var. dia',
            align: 'right',
            render: (r) => {
              const p = portfolioMap[r.ticker];
              if (!r.active || !p || p.priceUnavailable || p.changePercent == null) {
                return <span className="text-slate-400">—</span>;
              }
              const positive = p.changePercent >= 0;
              return (
                <span className={`tabular-nums font-medium ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
                  {positive ? '+' : ''}{p.changePercent.toFixed(2)}%
                </span>
              );
            },
          },
          {
            header: 'Val. mercado',
            align: 'right',
            render: (r) => {
              const p = portfolioMap[r.ticker];
              if (!r.active || !p || p.priceUnavailable) return <span className="text-slate-400">—</span>;
              return <span className="font-medium tabular-nums">{formatCurrency(p.marketValue!)}</span>;
            },
          },
          { header: 'Descrição', render: (r) => r.description ?? '—' },
          {
            header: 'Ações',
            align: 'right',
            width: '120px',
            render: (r) => (
              <div className="flex justify-end gap-1">
                {r.active ? (
                  <>
                    <button
                      className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-accent transition-colors"
                      onClick={() => { setEditing(r); setFormOpen(true); }}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                      onClick={() => setRemoving(r)}
                      title="Desativar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <button
                    className="rounded p-1.5 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                    onClick={() => handleReactivate(r)}
                    title="Reativar"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
              </div>
            ),
          },
        ]}
        data={pageItems}
      />

      <Pagination
        page={currentPage}
        totalPages={totalPages}
        totalElements={filtered.length}
        size={PAGE_SIZE}
        onPageChange={setCurrentPage}
      />

      <InvestmentFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={reload}
        editing={editing}
      />
      <ConfirmModal
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={handleConfirmRemove}
        title="Desativar investimento"
        message={
          <>
            Desativar <strong>{removing?.ticker}</strong>? Ele não aparecerá nos relatórios, mas pode ser reativado depois.
          </>
        }
        confirmLabel="Desativar"
        loading={removingLoading}
      />
    </div>
  );
}
