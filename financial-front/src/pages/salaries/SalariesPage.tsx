import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { SalaryFormModal } from './SalaryFormModal';
import { salaryService } from '../../services/salaryService';
import { formatCurrency } from '../../utils/currency';
import { monthLabel } from '../../utils/months';
import { extractApiError } from '../../utils/apiError';
import type { Salary } from '../../types/salary';

export function SalariesPage() {
  const [items, setItems] = useState<Salary[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Salary | null>(null);
  const [removing, setRemoving] = useState<Salary | null>(null);
  const [removingLoading, setRemovingLoading] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      setItems(await salaryService.list());
    } catch (err) {
      toast.error(extractApiError(err, 'Falha ao carregar salários.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleConfirmRemove() {
    if (!removing) return;
    setRemovingLoading(true);
    try {
      await salaryService.remove(removing.id);
      toast.success('Salário removido');
      setRemoving(null);
      reload();
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
        subtitle="Por competência (mês/ano)"
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Novo
          </Button>
        }
      />

      <Table<Salary>
        rowKey={(r) => r.id}
        loading={loading}
        empty="Nenhum salário cadastrado."
        columns={[
          { header: 'Competência', render: (r) => `${monthLabel(r.referenceMonth)} / ${r.referenceYear}` },
          { header: 'Conta', render: (r) => r.bankAccountName },
          { header: 'Valor', align: 'right', render: (r) => formatCurrency(r.amount) },
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
                    setFormOpen(true);
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
        data={items}
      />

      <SalaryFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={reload}
        editing={editing}
      />
      <ConfirmModal
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={handleConfirmRemove}
        title="Remover salário"
        message={
          removing && (
            <>
              Remover salário de <strong>{monthLabel(removing.referenceMonth)} / {removing.referenceYear}</strong>?
              Essa ação é definitiva (não há soft-delete em salário).
            </>
          )
        }
        confirmLabel="Remover"
        loading={removingLoading}
      />
    </div>
  );
}
