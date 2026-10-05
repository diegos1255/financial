import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { SeveranceSummaryCard } from './SeveranceSummaryCard';
import { SeverancePaymentFormModal } from './SeverancePaymentFormModal';
import { SeveranceTotalModal } from './SeveranceTotalModal';
import { severanceService } from '../../services/severanceService';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { extractApiError } from '../../utils/apiError';
import type { Severance, SeverancePayment } from '../../types/severance';

export function SeverancePage() {
  const [data, setData] = useState<Severance | null>(null);
  const [failed, setFailed] = useState(false);
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [editing, setEditing] = useState<SeverancePayment | null>(null);
  const [totalOpen, setTotalOpen] = useState(false);
  const [removing, setRemoving] = useState<SeverancePayment | null>(null);
  const [removingLoading, setRemovingLoading] = useState(false);

  const loading = !data && !failed;

  useEffect(() => {
    let cancelled = false;
    severanceService
      .get()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(extractApiError(err, 'Falha ao carregar rescisão.'));
        setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleConfirmRemove() {
    if (!removing) return;
    setRemovingLoading(true);
    try {
      setData(await severanceService.removePayment(removing.id));
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
        title="Rescisão"
        subtitle={data?.description ?? 'Recebimentos da rescisão'}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setPaymentFormOpen(true);
            }}
            disabled={!data}
          >
            <Plus className="h-4 w-4" />
            Registrar recebimento
          </Button>
        }
      />

      <SeveranceSummaryCard data={data} loading={loading} onEditTotal={() => setTotalOpen(true)} />

      <Table<SeverancePayment>
        rowKey={(r) => r.id}
        loading={loading}
        empty="Nenhum recebimento ainda."
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
        data={data?.payments ?? []}
      />

      {paymentFormOpen && data && (
        <SeverancePaymentFormModal
          onClose={() => setPaymentFormOpen(false)}
          onSaved={setData}
          severance={data}
          editing={editing}
        />
      )}
      {totalOpen && data && (
        <SeveranceTotalModal onClose={() => setTotalOpen(false)} onSaved={setData} data={data} />
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
              <strong>{formatDate(removing.paymentDate)}</strong>? Essa ação é definitiva.
            </>
          )
        }
        confirmLabel="Remover"
        loading={removingLoading}
      />
    </div>
  );
}
