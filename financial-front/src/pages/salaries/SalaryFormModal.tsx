import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { salaryService } from '../../services/salaryService';
import { bankAccountService } from '../../services/bankAccountService';
import { extractApiError } from '../../utils/apiError';
import { formatCurrency } from '../../utils/currency';
import { MONTHS, monthLabel, yearRange } from '../../utils/months';
import type { Salary } from '../../types/salary';
import type { BankAccount } from '../../types/bankAccount';

const NOW = new Date();
const YEARS = yearRange(NOW.getFullYear() - 5, NOW.getFullYear() + 1);

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: Salary | null;
};

type Payload = {
  bankAccountId: string;
  referenceYear: number;
  referenceMonth: number;
  amount: number;
  description: string | null;
};

export function SalaryFormModal({ open, onClose, onSaved, editing }: Props) {
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [bankAccountId, setBankAccountId] = useState('');
  const [year, setYear] = useState(NOW.getFullYear());
  const [month, setMonth] = useState(NOW.getMonth() + 1);
  const [amount, setAmount] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<Payload | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    bankAccountService.listAll().then(setBanks).catch(() => setBanks([]));
    setBankAccountId(editing?.bankAccountId ?? '');
    setYear(editing?.referenceYear ?? NOW.getFullYear());
    setMonth(editing?.referenceMonth ?? NOW.getMonth() + 1);
    setAmount(editing?.amount ?? null);
    setDescription(editing?.description ?? '');
    setConfirming(false);
    setPendingPayload(null);
    setError(null);
  }, [open, editing]);

  function handleSaveClick() {
    setError(null);
    if (!bankAccountId) return setError('Selecione uma conta bancária');
    const a = amount ?? 0;
    if (a <= 0) return setError('Valor deve ser maior que zero');

    const payload: Payload = {
      bankAccountId,
      referenceYear: year,
      referenceMonth: month,
      amount: a,
      description: description.trim() || null,
    };

    if (!editing) {
      setPendingPayload(payload);
      setConfirming(true);
    } else {
      doSubmit(payload);
    }
  }

  async function doSubmit(payload: Payload) {
    setSubmitting(true);
    try {
      if (editing) {
        await salaryService.update(editing.id, payload);
        toast.success('Salário atualizado');
      } else {
        await salaryService.create(payload);
        toast.success('Salário criado');
      }
      onSaved();
      onClose();
    } catch (err) {
      setConfirming(false);
      setError(extractApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={submitting ? () => {} : onClose}
      title={confirming ? 'Confirmar cadastro' : editing ? 'Editar salário' : 'Novo salário'}
      footer={
        confirming ? (
          <>
            <Button variant="ghost" onClick={() => setConfirming(false)} disabled={submitting}>
              Voltar
            </Button>
            <Button onClick={() => doSubmit(pendingPayload!)} disabled={submitting}>
              {submitting ? 'Salvando...' : 'Confirmar'}
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={handleSaveClick} disabled={submitting}>
              Salvar
            </Button>
          </>
        )
      }
    >
      {confirming && pendingPayload ? (
        <div className="flex flex-col gap-2 text-sm text-slate-700">
          <p>Confirmar o cadastro do salário abaixo?</p>
          <ul className="mt-1 space-y-1 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
            <li><span className="text-slate-500">Competência:</span> <strong>{monthLabel(pendingPayload.referenceMonth)} / {pendingPayload.referenceYear}</strong></li>
            <li><span className="text-slate-500">Valor:</span> <strong>{formatCurrency(pendingPayload.amount)}</strong></li>
            <li><span className="text-slate-500">Conta:</span> <strong>{banks.find(b => b.id === pendingPayload.bankAccountId)?.name ?? pendingPayload.bankAccountId}</strong></li>
          </ul>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Select
            id="sal-bank"
            label="Conta bancária"
            value={bankAccountId}
            onChange={(e) => setBankAccountId(e.target.value)}
          >
            <option value="">Selecione...</option>
            {banks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Mês" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
            <Select label="Ano" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </div>
          <CurrencyInput
            id="sal-amount"
            label="Valor"
            value={amount}
            onChange={setAmount}
          />
          <Input
            id="sal-desc"
            label="Descrição (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={255}
          />
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
