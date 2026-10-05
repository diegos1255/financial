import { useEffect, useMemo, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Eye, EyeOff, PieChart as PieIcon, Receipt, Wallet } from 'lucide-react';
import { KpiCard } from '../components/ui/KpiCard';
import { PieChart } from '../components/ui/PieChart';
import { Select } from '../components/ui/Select';
import { CategoryExpensesModal } from './dashboard/CategoryExpensesModal';
import { PortfolioCard } from './dashboard/PortfolioCard';
import { SeveranceCard } from './dashboard/SeveranceCard';
import { EvolutionChart } from './dashboard/EvolutionChart';
import { DashboardHero } from './dashboard/DashboardHero';
import { useAuth } from '../hooks/useAuth';
import { salaryTone } from './salaries/salaryTone';
import { dashboardService } from '../services/dashboardService';
import { investmentService } from '../services/investmentService';
import { pjService } from '../services/pjService';
import { severanceService } from '../services/severanceService';
import { salaryService } from '../services/salaryService';
import type { BalanceResponse, CategoryExpense, MonthEvolution } from '../types/dashboard';
import type { InvestmentPortfolioResponse } from '../types/investment';
import type { Severance } from '../types/severance';
import type { SalaryMonth } from '../types/salary';
import { formatCurrency } from '../utils/currency';
import { MONTHS, monthLabel, yearRange } from '../utils/months';
import { extractApiError } from '../utils/apiError';
import { useValuesVisibility } from '../hooks/useValuesVisibility';
import { SectionTitle } from '../components/ui/SectionTitle';
import { SECTION_CARD_CLASSES } from '../components/ui/sectionCard';

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

type PjTaxes = { das: number; inss: number; accounting: number };
const NO_TAXES: PjTaxes = { das: 0, inss: 0, accounting: 0 };

function SalaryProgress({ received, expected, mask }: { received: number; expected: number; mask: (v: string) => string }) {
  const percent = expected > 0 ? Math.min(100, Math.round((received / expected) * 100)) : 0;
  const tone = salaryTone(received);
  return (
    <div className="flex flex-col gap-1.5">
      <span>de {mask(formatCurrency(expected))} previstos</span>
      <div className="flex items-center gap-2">
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${percent}%` }} />
        </div>
        <span className="tabular-nums">{percent}%</span>
      </div>
    </div>
  );
}


export function DashboardPage() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [balance, setBalance] = useState<BalanceResponse | null>(null);
  const [byCategory, setByCategory] = useState<CategoryExpense[]>([]);
  const [portfolio, setPortfolio] = useState<InvestmentPortfolioResponse | null>(null);
  const [prevMonthTaxes, setPrevMonthTaxes] = useState<PjTaxes>(NO_TAXES);
  const [salaryMonth, setSalaryMonth] = useState<SalaryMonth | null>(null);
  const [evolution, setEvolution] = useState<MonthEvolution[]>([]);
  const [severance, setSeverance] = useState<Severance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { visible, toggle, mask } = useValuesVisibility();
  const { user } = useAuth();

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
      severanceService.get().catch(() => null),
      salaryService.getMonth(year, month).catch(() => null),
      dashboardService.evolution({ year, month, months: 6 }).catch(() => []),
    ])
      .then(([b, c, p, pjPrev, sev, sal, evo]) => {
        if (!cancelled) {
          setBalance(b);
          setByCategory(c);
          setPortfolio(p);
          setSeverance(sev);
          setSalaryMonth(sal);
          setEvolution(evo);
          const sumOf = (type: string) =>
            pjPrev.filter((e) => e.type === type).reduce((sum, e) => sum + e.amount, 0);
          setPrevMonthTaxes({ das: sumOf('DAS'), inss: sumOf('INSS'), accounting: sumOf('ACCOUNTING') });
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
  const hasPortfolio = !!portfolio && portfolio.items.length > 0;
  const hasSeverance = severance?.totalAmount != null;
  const taxesTotal = prevMonthTaxes.das + prevMonthTaxes.inss + prevMonthTaxes.accounting;
  const expectedSalary = salaryMonth?.expectedAmount ?? null;
  const totalByCategory = useMemo(
    () => byCategory.reduce((sum, c) => sum + c.total, 0),
    [byCategory]
  );

  function handleSliceClick(categoryId: string, categoryName: string) {
    setCategoryModal({ open: true, categoryId, categoryName });
  }

  return (
    <div>
      <DashboardHero
        firstName={user?.name.split(' ')[0] ?? ''}
        year={year}
        month={month}
        balance={balance}
        salaryMonth={salaryMonth}
        loading={loading}
        visible={visible}
        actions={
          <>
            <button
              type="button"
              onClick={toggle}
              title={visible ? 'Ocultar valores' : 'Mostrar valores'}
              aria-label={visible ? 'Ocultar valores' : 'Mostrar valores'}
              className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-accent transition-colors"
            >
              {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
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
          value={mask(formatCurrency(balance?.salary ?? 0))}
          icon={<ArrowUpCircle className="h-5 w-5" />}
          variant="neutral"
          accent="emerald"
          subtitle={
            loading ? 'Carregando...' : expectedSalary !== null && balance ? (
              <SalaryProgress received={balance.salary} expected={expectedSalary} mask={mask} />
            ) : undefined
          }
        />
        <KpiCard
          title="Total de Despesas"
          value={mask(formatCurrency(balance?.totalExpenses ?? 0))}
          icon={<ArrowDownCircle className="h-5 w-5" />}
          variant="neutral"
          accent="red"
          subtitle={
            balance ? (
              <div className="grid grid-cols-2 gap-1.5">
                <BreakdownChip tone="blue" label="Fixas" value={mask(formatCurrency(balance.breakdown.fixed))} />
                <BreakdownChip tone="violet" label="Variáveis" value={mask(formatCurrency(balance.breakdown.variable))} />
                <BreakdownChip tone="emerald" label="Pagas" value={mask(formatCurrency(balance.breakdown.installmentsPaid))} />
                <BreakdownChip tone="amber" label="Pendentes" value={mask(formatCurrency(balance.breakdown.installmentsPending))} />
              </div>
            ) : undefined
          }
        />
        <KpiCard
          title="Saldo"
          value={mask(formatCurrency(balance?.balance ?? 0))}
          icon={<Wallet className="h-5 w-5" />}
          variant={balanceVariant}
          accent={balance && balance.balance < 0 ? 'red' : 'emerald'}
        />
        <KpiCard
          title="Impostos PJ"
          value={mask(formatCurrency(taxesTotal))}
          icon={<Receipt className="h-5 w-5" />}
          variant={taxesTotal > 0 ? 'negative' : 'neutral'}
          accent="amber"
          subtitle={
            <div className="flex flex-col gap-1.5">
              <span>Referente a {monthLabel(prevMonth)}/{prevYear}</span>
              {taxesTotal > 0 && (
                <div className="grid grid-cols-2 gap-1.5">
                  <BreakdownChip tone="blue" label="DAS" value={mask(formatCurrency(prevMonthTaxes.das))} />
                  <BreakdownChip tone="violet" label="INSS" value={mask(formatCurrency(prevMonthTaxes.inss))} />
                  <BreakdownChip tone="amber" label="Contabilidade" value={mask(formatCurrency(prevMonthTaxes.accounting))} />
                </div>
              )}
            </div>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className={SECTION_CARD_CLASSES}>
          <SectionTitle icon={<PieIcon className="h-4 w-4" />} title="Despesas por categoria" tone="indigo" />
          <PieChart
            data={byCategory.map((c) => ({
              name: c.categoryName,
              value: c.total,
              color: c.color ?? undefined,
              categoryId: c.categoryId,
            }))}
            centerTotal={totalByCategory}
            centerLabel="SAÍDAS NO MÊS"
            centerValueOverride={visible ? undefined : mask('')}
            maskValue={mask}
            onSliceClick={handleSliceClick}
          />
        </div>

        {(hasPortfolio || hasSeverance) && (
          <div className="flex flex-col gap-4">
            {hasPortfolio && (
              <div className="flex-1">
                <PortfolioCard portfolio={portfolio} />
              </div>
            )}
            {hasSeverance && <SeveranceCard severance={severance} mask={mask} />}
          </div>
        )}
      </div>

      <div className="mb-4">
        <EvolutionChart key={`${year}-${month}`} data={evolution} selectedYear={year} selectedMonth={month} visible={visible} mask={mask} />
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
