import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { salaryService } from '../../services/salaryService';
import { bankAccountService } from '../../services/bankAccountService';
import { extractApiError } from '../../utils/apiError';
import { celebrateSuccess } from '../../utils/celebrate';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { monthLabel } from '../../utils/months';
import type { SalaryMonth, SalaryPayment, SalaryPaymentRequest } from '../../types/salary';
import type { BankAccount } from '../../types/bankAccount';

const LAST_ACCOUNT_KEY = 'financial.salary.lastBankAccountId';

// Montado so enquanto aberto: o estado inicial vem das props.
type Props = {
  onClose: () => void;
  onSaved: (month: SalaryMonth) => void;
  month: SalaryMonth;
  editing: SalaryPayment | null;
};

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function competenceBounds(year: number, month: number) {
  const lastDay = new Date(year, month, 0).getDate();
  return { min: `${year}-${pad(month)}-01`, max: `${year}-${pad(month)}-${pad(lastDay)}` };
}

// Hoje no fuso local (toISOString usaria UTC e viraria o dia a noite).
function defaultDate(year: number, month: number): string {
  const now = new Date();
  if (now.getFullYear() === year && now.getMonth() + 1 === month) {
    return `${year}-${pad(month)}-${pad(now.getDate())}`;
  }
  return `${year}-${pad(month)}-01`;
}

function readLastAccount(): string | null {
  try {
    return localStorage.getItem(LAST_ACCOUNT_KEY);
  } catch {
    return null;
  }
}

function writeLastAccount(id: string) {
  try {
    localStorage.setItem(LAST_ACCOUNT_KEY, id);
  } catch {
    // preferencia de conveniencia; sem storage segue sem lembrar
  }
}

export function SalaryPaymentFormModal({ onClose, onSaved, month, editing }: Props) {
  const { referenceYear: year, referenceMonth: mon } = month;
  const bounds = competenceBounds(year, mon);

  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [bankAccountId, setBankAccountId] = useState(editing?.bankAccountId ?? '');
  const [paymentDate, setPaymentDate] = useState(editing?.paymentDate ?? defaultDate(year, mon));
  const [amount, setAmount] = useState<number | null>(editing?.amount ?? null);
  const [description, setDescription] = useState(editing?.description ?? '');
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editingAccountId = editing?.bankAccountId;
  useEffect(() => {
    bankAccountService
      .listAll()
      .then((all) => {
        const usable = all.filter((b) => b.active || b.id === editingAccountId);
        setBanks(usable);
        if (!editingAccountId) {
          const last = readLastAccount();
          setBankAccountId(usable.find((b) => b.id === last)?.id ?? usable[0]?.id ?? '');
        }
      })
      .catch(() => setBanks([]));
  }, [editingAccountId]);

  const exceedsExpected = useMemo(() => {
    if (month.expectedAmount === null || !amount) return false;
    const othersReceived = month.receivedAmount - (editing?.amount ?? 0);
    return othersReceived + amount > month.expectedAmount;
  }, [month, amount, editing]);

  function validationError(): string | null {
    if (!paymentDate) return 'Informe a data do recebimento';
    if (paymentDate < bounds.min || paymentDate > bounds.max) {
      return `A data deve estar dentro de ${monthLabel(mon)} / ${year}`;
    }
    if (!amount || amount <= 0) return 'Valor deve ser maior que zero';
    if (!bankAccountId) return 'Selecione uma conta bancária';
    return null;
  }

  function buildPayload(): SalaryPaymentRequest | null {
    const message = validationError();
    setError(message);
    if (message) return null;
    return { paymentDate, amount: amount!, bankAccountId, description: description.trim() || null };
  }

  function handleSaveClick() {
    const payload = buildPayload();
    if (!payload) return;
    if (editing) doSubmit(payload);
    else setConfirming(true);
  }

  async function doSubmit(payload: SalaryPaymentRequest) {
    setSubmitting(true);
    try {
      const updated = editing
        ? await salaryService.updatePayment(editing.id, payload)
        : await salaryService.addPayment(year, mon, payload);
      writeLastAccount(payload.bankAccountId);
      if (editing) {
        toast.success('Recebimento atualizado');
      } else {
        toast.success('Recebimento registrado');
        celebrateSuccess(4000);
      }
      onSaved(updated);
      onClose();
    } catch (err) {
      setConfirming(false);
      setError(extractApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  const bankName = banks.find((b) => b.id === bankAccountId)?.name ?? '';

  return (
    <Modal
      open
      onClose={submitting ? () => {} : onClose}
      title={confirming ? 'Confirmar recebimento' : editing ? 'Editar recebimento' : 'Registrar recebimento'}
      footer={
        confirming ? (
          <>
            <Button variant="ghost" onClick={() => setConfirming(false)} disabled={submitting}>
              Voltar
            </Button>
            <Button onClick={() => { const p = buildPayload(); if (p) doSubmit(p); }} disabled={submitting}>
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
      {confirming ? (
        <div className="flex flex-col gap-2 text-sm text-slate-700">
          <p>Confirmar o recebimento abaixo?</p>
          <ul className="mt-1 space-y-1 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
            <li><span className="text-slate-500">Competência:</span> <strong>{monthLabel(mon)} / {year}</strong></li>
            <li><span className="text-slate-500">Data:</span> <strong>{formatDate(paymentDate)}</strong></li>
            <li><span className="text-slate-500">Valor:</span> <strong>{formatCurrency(amount ?? 0)}</strong></li>
            <li><span className="text-slate-500">Conta:</span> <strong>{bankName}</strong></li>
          </ul>
          {exceedsExpected && (
            <p className="text-amber-700">Com este valor o recebido passa do total previsto.</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-500">
            Competência: <strong className="text-slate-700">{monthLabel(mon)} / {year}</strong>
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="sal-pay-date"
              label="Data do recebimento"
              type="date"
              value={paymentDate}
              min={bounds.min}
              max={bounds.max}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
            <CurrencyInput id="sal-pay-amount" label="Valor" value={amount} onChange={setAmount} autoFocus />
          </div>
          {exceedsExpected && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Com este valor o recebido passa do total previsto ({formatCurrency(month.expectedAmount ?? 0)}).
            </div>
          )}
          <Select
            id="sal-pay-bank"
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
          <Input
            id="sal-pay-desc"
            label="Descrição (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={255}
          />
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}
        </div>
      )}
    </Modal>
  );
}
