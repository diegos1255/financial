import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { DollarSign, Pencil, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Table } from '../../components/ui/Table';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { SalarySummaryCard } from './SalarySummaryCard';
import { SalaryPaymentFormModal } from './SalaryPaymentFormModal';
import { SalaryTotalModal } from './SalaryTotalModal';
import { salaryService } from '../../services/salaryService';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { MONTHS, monthLabel, yearRange } from '../../utils/months';
import { extractApiError } from '../../utils/apiError';
import type { SalaryMonth, SalaryPayment } from '../../types/salary';

const NOW = new Date();
const YEARS = yearRange(NOW.getFullYear() - 5, NOW.getFullYear() + 1);

export function SalariesPage() {
  const [year, setYear] = useState(NOW.getFullYear());
  const [month, setMonth] = useState(NOW.getMonth() + 1);
  const [data, setData] = useState<SalaryMonth | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [editing, setEditing] = useState<SalaryPayment | null>(null);
  const [totalOpen, setTotalOpen] = useState(false);
  const [removing, setRemoving] = useState<SalaryPayment | null>(null);
  const [removingLoading, setRemovingLoading] = useState(false);

  const key = `${year}-${month}`;
  const current = data && data.referenceYear === year && data.referenceMonth === month ? data : null;
  const loading = !current && failedKey !== key;

  useEffect(() => {
    let cancelled = false;
    salaryService
      .getMonth(year, month)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setFailedKey(null);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(extractApiError(err, 'Falha ao carregar salário do mês.'));
        setFailedKey(`${year}-${month}`);
      });
    return () => {
      cancelled = true;
    };
  }, [year, month]);

  async function handleConfirmRemove() {
    if (!removing) return;
    setRemovingLoading(true);
    try {
      setData(await salaryService.removePayment(removing.id));
      toast.success('Recebimento removido');
      setRemoving(null);
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setRemovingLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Salários"
        subtitle="Recebimentos por competência"
        icon={DollarSign}
        tone="emerald"
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setPaymentFormOpen(true);
            }}
            disabled={!current}
          >
            <Plus className="h-4 w-4" />
            Registrar recebimento
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-44">
          <Select value={month} onChange={(e) => setMonth(Number(e.target.value))} aria-label="Mês">
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-32">
          <Select value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Ano">
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <SalarySummaryCard data={current} loading={loading} onEditTotal={() => setTotalOpen(true)} />

      <Table<SalaryPayment>
        rowKey={(r) => r.id}
        loading={loading}
        empty="Nenhum recebimento neste mês."
        columns={[
          { header: 'Data', render: (r) => formatDate(r.paymentDate) },
          { header: 'Valor', align: 'right', render: (r) => formatCurrency(r.amount) },
          { header: 'Conta', render: (r) => r.bankAccountName },
          { header: 'Descrição', render: (r) => r.description ?? '—' },
          {
            header: 'Ações',
            align: 'right',
            width: '120px',
            render: (r) => (
              <div className="flex justify-end gap-1">
                <button
                  className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-accent transition-colors"
                  onClick={() => {
                    setEditing(r);
                    setPaymentFormOpen(true);
                  }}
                  title="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                  onClick={() => setRemoving(r)}
                  title="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ),
          },
        ]}
        data={current?.payments ?? []}
      />

      {paymentFormOpen && current && (
        <SalaryPaymentFormModal
          onClose={() => setPaymentFormOpen(false)}
          onSaved={setData}
          month={current}
          editing={editing}
        />
      )}
      {totalOpen && current && (
        <SalaryTotalModal onClose={() => setTotalOpen(false)} onSaved={setData} data={current} />
      )}
      <ConfirmModal
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={handleConfirmRemove}
        title="Remover recebimento"
        message={
          removing && (
            <>
              Remover o recebimento de <strong>{formatCurrency(removing.amount)}</strong> em{' '}
              <strong>{formatDate(removing.paymentDate)}</strong> ({monthLabel(month)} / {year})? Essa ação é definitiva.
            </>
          )
        }
        confirmLabel="Remover"
        loading={removingLoading}
      />
    </div>
  );
}
