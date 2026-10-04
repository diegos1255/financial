import { useState } from 'react';
import toast from 'react-hot-toast';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { salaryService } from '../../services/salaryService';
import { extractApiError } from '../../utils/apiError';
import { monthLabel } from '../../utils/months';
import type { SalaryMonth } from '../../types/salary';

// Montado so enquanto aberto: o estado inicial vem direto de `data`.
type Props = {
  onClose: () => void;
  onSaved: (month: SalaryMonth) => void;
  data: SalaryMonth;
};

export function SalaryTotalModal({ onClose, onSaved, data }: Props) {
  const [amount, setAmount] = useState<number | null>(data.expectedAmount);
  const [description, setDescription] = useState(data.description ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSubmitting(true);
    setError(null);
    try {
      const updated = await salaryService.updateHeader(data.referenceYear, data.referenceMonth, {
        // Campo zerado = total nao informado.
        expectedAmount: amount && amount > 0 ? amount : null,
        description: description.trim() || null,
      });
      toast.success('Total atualizado');
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open
      onClose={submitting ? () => {} : onClose}
      title={`Total a receber — ${monthLabel(data.referenceMonth)} / ${data.referenceYear}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={submitting}>
            {submitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {data.expectedFromInvoice && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Este total vem da Nota Fiscal do mês. Se a NF for alterada, ele será sobrescrito.
          </div>
        )}
        <CurrencyInput id="sal-total" label="Total a receber" value={amount} onChange={setAmount} autoFocus />
        <p className="-mt-2 text-xs text-slate-500">Deixe zerado para não informar o total.</p>
        <Input
          id="sal-total-desc"
          label="Descrição (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={255}
        />
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}
      </div>
    </Modal>
  );
}
