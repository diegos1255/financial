import { useEffect, useMemo, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, PieChart as PieIcon, Receipt, Wallet } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { KpiCard } from '../components/ui/KpiCard';
import { PieChart } from '../components/ui/PieChart';
import { Select } from '../components/ui/Select';
import { CategoryExpensesModal } from './dashboard/CategoryExpensesModal';
import { PortfolioCard } from './dashboard/PortfolioCard';
import { dashboardService } from '../services/dashboardService';
import { investmentService } from '../services/investmentService';
import { pjService } from '../services/pjService';
import type { BalanceResponse, CategoryExpense } from '../types/dashboard';
import type { InvestmentPortfolioResponse } from '../types/investment';
import { formatCurrency } from '../utils/currency';
import { MONTHS, monthLabel, yearRange } from '../utils/months';
import { extractApiError } from '../utils/apiError';

const NOW = new Date();
const CURRENT_YEAR = NOW.getFullYear();
const CURRENT_MONTH = NOW.getMonth() + 1;
const YEARS = yearRange(CURRENT_YEAR - 5, CURRENT_YEAR + 1);

type CategoryModal = { open: boolean; categoryId: string; categoryName: string };

type ChipTone = 'blue' | 'violet' | 'emerald' | 'amber';

const CHIP_TONE_CLASSES: Record<ChipTone, string> = {
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
};

function BreakdownChip({ tone, label, value }: { tone: ChipTone; label: string; value: string }) {
  return (
    <div
      className={`flex flex-col gap-0.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium ring-1 ring-inset tabular-nums ${CHIP_TONE_CLASSES[tone]}`}
    >
      <span className="opacity-75">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

export function DashboardPage() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [balance, setBalance] = useState<BalanceResponse | null>(null);
  const [byCategory, setByCategory] = useState<CategoryExpense[]>([]);
  const [portfolio, setPortfolio] = useState<InvestmentPortfolioResponse | null>(null);
  const [prevMonthTaxes, setPrevMonthTaxes] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const [categoryModal, setCategoryModal] = useState<CategoryModal>({
    open: false,
    categoryId: '',
    categoryName: '',
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      dashboardService.balance({ year, month }),
      dashboardService.expensesByCategory({ year, month }),
      investmentService.getPortfolio().catch(() => null),
      pjService.list({ year: prevYear, month: prevMonth }).catch(() => []),
    ])
      .then(([b, c, p, pjPrev]) => {
        if (!cancelled) {
          setBalance(b);
          setByCategory(c);
          setPortfolio(p);
          const taxes = pjPrev
            .filter((e) => e.type === 'DAS' || e.type === 'INSS' || e.type === 'ACCOUNTING')
            .reduce((sum, e) => sum + e.amount, 0);
          setPrevMonthTaxes(taxes);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(extractApiError(err, 'Falha ao carregar dashboard.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [year, month]);

  const balanceVariant = balance && balance.balance < 0 ? 'negative' : 'positive';
  const totalByCategory = useMemo(
    () => byCategory.reduce((sum, c) => sum + c.total, 0),
    [byCategory]
  );

  function handleSliceClick(categoryId: string, categoryName: string) {
    setCategoryModal({ open: true, categoryId, categoryName });
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`Visão geral do mês ${monthLabel(month)}`}
        actions={
          <>
            <Select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
            <Select value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </>
        }
      />

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          title="Salário"
          value={formatCurrency(balance?.salary ?? 0)}
          icon={<ArrowUpCircle className="h-5 w-5" />}
          variant="neutral"
          subtitle={loading ? 'Carregando...' : undefined}
        />
        <KpiCard
          title="Total de Despesas"
          value={formatCurrency(balance?.totalExpenses ?? 0)}
          icon={<ArrowDownCircle className="h-5 w-5" />}
          variant="neutral"
          subtitle={
            balance ? (
              <div className="grid grid-cols-2 gap-1.5">
                <BreakdownChip tone="blue" label="Fixas" value={formatCurrency(balance.breakdown.fixed)} />
                <BreakdownChip tone="violet" label="Variáveis" value={formatCurrency(balance.breakdown.variable)} />
                <BreakdownChip tone="emerald" label="Pagas" value={formatCurrency(balance.breakdown.installmentsPaid)} />
                <BreakdownChip tone="amber" label="Pendentes" value={formatCurrency(balance.breakdown.installmentsPending)} />
              </div>
            ) : undefined
          }
        />
        <KpiCard
          title="Saldo"
          value={formatCurrency(balance?.balance ?? 0)}
          icon={<Wallet className="h-5 w-5" />}
          variant={balanceVariant}
        />
        <KpiCard
          title="Impostos PJ"
          value={formatCurrency(prevMonthTaxes)}
          icon={<Receipt className="h-5 w-5" />}
          variant="negative"
          subtitle={`Referente a ${monthLabel(prevMonth)}/${prevYear}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2 mb-3">
            <PieIcon className="h-4 w-4 text-slate-400" />
            <h2 className="text-xs font-semibold text-slate-500 tracking-wider uppercase">
              Despesas por categoria
            </h2>
          </div>
          <div className="-mx-5 border-t border-slate-100 mb-4" />
          <PieChart
            data={byCategory.map((c) => ({
              name: c.categoryName,
              value: c.total,
              color: c.color ?? undefined,
              categoryId: c.categoryId,
            }))}
            centerTotal={totalByCategory}
            centerLabel="SAÍDAS NO MÊS"
            onSliceClick={handleSliceClick}
          />
        </div>

        {portfolio && portfolio.items.length > 0 && (
          <PortfolioCard portfolio={portfolio} />
        )}
      </div>

      <CategoryExpensesModal
        open={categoryModal.open}
        onClose={() => setCategoryModal((prev) => ({ ...prev, open: false }))}
        categoryId={categoryModal.categoryId}
        categoryName={categoryModal.categoryName}
        year={year}
        month={month}
      />
    </div>
  );
}
