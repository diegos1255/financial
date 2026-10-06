import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Briefcase, Download, FileText, Pencil, PiggyBank, Plus, Receipt, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { KpiCard } from '../../components/ui/KpiCard';
import { Table } from '../../components/ui/Table';
import { Select } from '../../components/ui/Select';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { PjEntryFormModal } from './PjEntryFormModal';
import { pjService } from '../../services/pjService';
import { formatCurrency } from '../../utils/currency';
import { MONTHS, shiftedMonthLabel, yearRange } from '../../utils/months';
import { extractApiError } from '../../utils/apiError';
import { PJ_TYPE_LABELS } from '../../types/pj';
import type { PjEntry } from '../../types/pj';

const NOW = new Date();
const YEARS = yearRange(NOW.getFullYear() - 5, NOW.getFullYear() + 1);

export function PjPage() {
  const [items, setItems] = useState<PjEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<number | ''>(NOW.getFullYear());
  const [month, setMonth] = useState<number | ''>(NOW.getMonth() + 1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<PjEntry | null>(null);
  const [removing, setRemoving] = useState<PjEntry | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      const list = await pjService.list({
        year: year === '' ? undefined : year,
        month: month === '' ? undefined : month,
      });
      setItems(list);
    } catch (err) {
      toast.error(extractApiError(err, 'Falha ao carregar lançamentos PJ.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  async function handleDownload(entry: PjEntry) {
    try {
      await pjService.download(entry.id, entry.fileName);
    } catch (err) {
      toast.error(extractApiError(err, 'Falha ao baixar arquivo.'));
    }
  }

  const showSummary = year !== '' && month !== '';
  const nfAmount = items
    .filter((i) => i.type === 'INVOICE')
    .reduce((sum, i) => sum + i.amount, 0);
  const taxesTotal = items
    .filter((i) => i.type === 'DAS' || i.type === 'INSS' || i.type === 'ACCOUNTING')
    .reduce((sum, i) => sum + i.amount, 0);

  async function handleConfirmRemove() {
    if (!removing) return;
    setRemoveLoading(true);
    try {
      await pjService.remove(removing.id);
      toast.success('Lançamento excluído');
      setRemoving(null);
      reload();
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setRemoveLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="PJ"
        subtitle="Notas fiscais e encargos fiscais mensais"
        icon={Briefcase}
        tone="violet"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Novo lançamento
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
      </div>

      {showSummary && (
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <KpiCard
            title="NF do mês"
            value={formatCurrency(nfAmount)}
            icon={<FileText className="h-5 w-5" />}
            accent="emerald"
            subtitle={`Preenche o salário de ${shiftedMonthLabel(Number(month), 1).toLowerCase()}`}
          />
          <KpiCard
            title="Impostos do mês"
            value={formatCurrency(taxesTotal)}
            icon={<Receipt className="h-5 w-5" />}
            variant={taxesTotal > 0 ? 'negative' : 'neutral'}
            accent="amber"
            subtitle="DAS + INSS + Contabilidade"
          />
          <KpiCard
            title="Líquido"
            value={formatCurrency(nfAmount - taxesTotal)}
            icon={<PiggyBank className="h-5 w-5" />}
            variant={nfAmount - taxesTotal < 0 ? 'negative' : 'positive'}
            accent={nfAmount - taxesTotal < 0 ? 'red' : 'indigo'}
            subtitle="O que sobra da nota depois dos impostos"
          />
        </div>
      )}

      <div>
        <Table<PjEntry>
          rowKey={(r) => r.id}
          loading={loading}
          empty="Nenhum lançamento PJ nesse período."
          columns={[
            {
              header: 'Tipo',
              align: 'left',
              render: (r) => (
                <span className="font-medium text-slate-800">{PJ_TYPE_LABELS[r.type]}</span>
              ),
            },
            // Com um mes especifico no filtro a competencia so repetiria o filtro.
            ...(showSummary
              ? []
              : [
                  {
                    header: 'Competência',
                    align: 'center' as const,
                    render: (r: PjEntry) => `${String(r.month).padStart(2, '0')}/${r.year}`,
                  },
                ]),
            {
              header: 'Valor',
              align: 'right',
              render: (r) => <span className="tabular-nums">{formatCurrency(r.amount)}</span>,
            },
            {
              header: 'Arquivo',
              align: 'left',
              render: (r) => (
                <span className="text-xs text-slate-500 truncate max-w-[200px] inline-block align-middle">
                  {r.fileName}
                </span>
              ),
            },
            {
              header: 'Ações',
              align: 'right',
              width: '160px',
              render: (r) => (
                <div className="flex justify-end gap-1">
                  <button
                    className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-accent transition-colors"
                    onClick={() => handleDownload(r)}
                    title="Baixar arquivo"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-accent transition-colors"
                    onClick={() => setEditing(r)}
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                    onClick={() => setRemoving(r)}
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ),
            },
          ]}
          data={items}
        />
      </div>

      <PjEntryFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={reload}
        editing={null}
      />
      <PjEntryFormModal
        open={!!editing}
        onClose={() => setEditing(null)}
        onSaved={reload}
        editing={editing}
      />
      <ConfirmModal
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={handleConfirmRemove}
        title="Excluir lançamento PJ"
        message={
          removing && (
            <>
              Excluir <strong>{PJ_TYPE_LABELS[removing.type]}</strong> de {String(removing.month).padStart(2, '0')}/{removing.year}?
              O arquivo anexado também será removido.
            </>
          )
        }
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        loading={removeLoading}
      />
    </div>
  );
}
