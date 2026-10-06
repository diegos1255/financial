import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Activity, ChevronDown, ChevronUp, Coins, Layers, Pencil, Plus, RotateCcw, Search, Trash2, TrendingUp, Wallet } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { KpiCard } from '../../components/ui/KpiCard';
import { Table } from '../../components/ui/Table';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { Pagination } from '../../components/ui/Pagination';
import { InvestmentFormModal } from './InvestmentFormModal';
import { InvestmentTransactionModal } from './InvestmentTransactionModal';
import { InvestmentIncomeModal } from './InvestmentIncomeModal';
import { InvestmentHistoryPanel } from './InvestmentHistoryPanel';
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
  // WORK-36: aportes, proventos e historico por ativo
  const [txFor, setTxFor] = useState<string | null | undefined>(undefined);
  const [incomeFor, setIncomeFor] = useState<string | null | undefined>(undefined);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const activeItems = useMemo(() => allItems.filter((i) => i.active), [allItems]);

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

  // Resumo da carteira ativa (WORK-33). Variacao do dia ponderada pelo valor de mercado.
  const summary = useMemo(() => {
    const priced = allItems
      .filter((i) => i.active)
      .map((i) => portfolioMap[i.ticker])
      .filter((p): p is InvestmentPortfolioItem => !!p && !p.priceUnavailable && p.marketValue != null);
    const total = priced.reduce((sum, p) => sum + (p.marketValue ?? 0), 0);
    const withChange = priced.filter((p) => p.changePercent != null);
    const weightBase = withChange.reduce((sum, p) => sum + (p.marketValue ?? 0), 0);
    const dayChange =
      weightBase > 0
        ? withChange.reduce((sum, p) => sum + (p.marketValue ?? 0) * (p.changePercent ?? 0), 0) / weightBase
        : null;
    return { total, dayChange, count: allItems.filter((i) => i.active).length };
  }, [allItems, portfolioMap]);

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
        subtitle="Carteira com cotações de mercado"
        icon={TrendingUp}
        tone="blue"
        actions={
          <>
            <Button variant="outline" onClick={() => setIncomeFor(null)} disabled={activeItems.length === 0}>
              <Coins className="h-4 w-4" />
              Registrar provento
            </Button>
            <Button variant="outline" onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4" />
              Novo ativo
            </Button>
            <Button onClick={() => setTxFor(null)} disabled={activeItems.length === 0}>
              <Plus className="h-4 w-4" />
              Registrar aporte
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiCard
          title="Valor de mercado"
          value={formatCurrency(summary.total)}
          icon={<Wallet className="h-5 w-5" />}
          accent="indigo"
          subtitle={loading ? 'Carregando...' : 'Soma da carteira ativa'}
        />
        <KpiCard
          title="Variação do dia"
          value={summary.dayChange === null ? '—' : `${summary.dayChange >= 0 ? '+' : ''}${summary.dayChange.toFixed(2)}%`}
          icon={<Activity className="h-5 w-5" />}
          variant={summary.dayChange === null ? 'neutral' : summary.dayChange >= 0 ? 'positive' : 'negative'}
          accent={summary.dayChange !== null && summary.dayChange < 0 ? 'red' : 'emerald'}
          subtitle="Média ponderada pelo valor de cada ativo"
        />
        <KpiCard
          title="Ativos"
          value={String(summary.count)}
          icon={<Layers className="h-5 w-5" />}
          accent="slate"
          subtitle={summary.count === 1 ? 'ativo na carteira' : 'ativos na carteira'}
        />
      </div>

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
        expandedRowKey={expandedId}
        expandedRowContent={(r) => <InvestmentHistoryPanel key={r.id} investment={r} onChanged={reload} />}
        loading={loading}
        empty="Nenhum investimento cadastrado."
        columns={[
          {
            header: 'Ticker',
            render: (r) => (
              <span className={`font-semibold tabular-nums ${r.active ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
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
            width: '200px',
            render: (r) => (
              <div className="flex justify-end gap-1">
                <button
                  className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                  onClick={() => setExpandedId((cur) => (cur === r.id ? null : r.id))}
                  title={expandedId === r.id ? 'Fechar histórico' : 'Ver histórico (aportes e proventos)'}
                >
                  {expandedId === r.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {r.active ? (
                  <>
                    <button
                      className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-emerald-600 transition-colors"
                      onClick={() => setTxFor(r.id)}
                      title="Registrar aporte"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <button
                      className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-amber-600 transition-colors"
                      onClick={() => setIncomeFor(r.id)}
                      title="Registrar provento"
                    >
                      <Coins className="h-4 w-4" />
                    </button>
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

      {txFor !== undefined && (
        <InvestmentTransactionModal
          investments={activeItems}
          defaultInvestmentId={txFor ?? undefined}
          onClose={() => setTxFor(undefined)}
          onSaved={reload}
        />
      )}
      {incomeFor !== undefined && (
        <InvestmentIncomeModal
          investments={activeItems}
          defaultInvestmentId={incomeFor ?? undefined}
          onClose={() => setIncomeFor(undefined)}
          onSaved={reload}
        />
      )}
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
