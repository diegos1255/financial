import { useState } from 'react';
import toast from 'react-hot-toast';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { investmentService } from '../../services/investmentService';
import { extractApiError } from '../../utils/apiError';
import { formatCurrency } from '../../utils/currency';
import { todayLocal } from './localDate';
import { INCOME_TYPE_LABELS } from '../../types/investment';
import type { Investment, InvestmentIncomeType } from '../../types/investment';

// Montado so enquanto aberto.
type Props = {
  investments: Investment[];
  defaultInvestmentId?: string;
  onClose: () => void;
  onSaved: () => void;
};

type Mode = 'total' | 'perShare';

/** "0,0823" ou "0.0823" -> 0.0823; vazio ou invalido -> null. Ate 6 casas (valor por cota de FII costuma ter 2 a 4). */
function parseDecimal(raw: string): number | null {
  const trimmed = raw.trim();
  const normalized = trimmed.includes(',') ? trimmed.replace(/\./g, '').replace(',', '.') : trimmed;
  if (!/^\d*\.?\d{0,6}$/.test(normalized) || normalized === '' || normalized === '.') return null;
  const n = Number(normalized);
  return n > 0 ? n : null;
}

/** Lancar provento a mao (WORK-36): valor total ou por cota; data futura = "a receber". */
export function InvestmentIncomeModal({ investments, defaultInvestmentId, onClose, onSaved }: Props) {
  const today = todayLocal();
  const [investmentId, setInvestmentId] = useState(defaultInvestmentId ?? investments[0]?.id ?? '');
  const [type, setType] = useState<InvestmentIncomeType>('RENDIMENTO');
  const [paymentDate, setPaymentDate] = useState(today);
  const [mode, setMode] = useState<Mode>('total');
  const [amount, setAmount] = useState<number | null>(null);
  const [unitRaw, setUnitRaw] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const investment = investments.find((i) => i.id === investmentId);
  const quantity = investment?.quantity ?? 0;
  const unitValue = parseDecimal(unitRaw);
  const computed = unitValue ? Math.round(unitValue * quantity * 100) / 100 : null;
  const pending = paymentDate > today;

  async function handleSave() {
    if (!investmentId) return setError('Selecione o ativo');
    if (!paymentDate) return setError('Informe a data do pagamento');
    if (mode === 'total' && (!amount || amount <= 0)) return setError('Informe o valor do provento');
    if (mode === 'perShare' && !unitValue) return setError('Informe o valor por cota (ex.: 0,07)');
    setSubmitting(true);
    setError(null);
    try {
      await investmentService.addIncome(
        investmentId,
        mode === 'total' ? { type, paymentDate, amount: amount! } : { type, paymentDate, unitValue: unitValue! },
      );
      toast.success(pending ? 'Provento a receber registrado' : 'Provento registrado');
      onSaved();
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
      title={investment && defaultInvestmentId ? `Registrar provento — ${investment.ticker}` : 'Registrar provento'}
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
        <div className="grid grid-cols-2 gap-3">
          <Select id="inc-inv" label="Ativo" value={investmentId} onChange={(e) => setInvestmentId(e.target.value)}>
            {investments.map((i) => (
              <option key={i.id} value={i.id}>
                {i.ticker} ({i.quantity} cotas)
              </option>
            ))}
          </Select>
          <Select id="inc-type" label="Tipo" value={type} onChange={(e) => setType(e.target.value as InvestmentIncomeType)}>
            {Object.entries(INCOME_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        <Input id="inc-date" label="Data do pagamento" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />

        <div>
          <div className="mb-2 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Como informar o valor">
            {(
              [
                ['total', 'Valor total'],
                ['perShare', 'Valor por cota'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={mode === key}
                onClick={() => setMode(key)}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  mode === key
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {mode === 'total' ? (
            <CurrencyInput id="inc-amount" label="Valor do provento" value={amount} onChange={setAmount} autoFocus />
          ) : (
            <>
              <Input
                id="inc-unit"
                label="Valor por cota (R$)"
                inputMode="decimal"
                placeholder="0,07"
                value={unitRaw}
                onChange={(e) => setUnitRaw(e.target.value)}
                autoFocus
              />
              <p className="mt-1.5 text-sm text-slate-500">
                {quantity} cotas × {unitValue ? unitValue.toLocaleString('pt-BR', { maximumFractionDigits: 6 }) : '—'} ={' '}
                <strong className="text-emerald-700">{computed ? formatCurrency(computed) : '—'}</strong>
              </p>
            </>
          )}
        </div>

        {pending && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-sm text-emerald-800">
            Data futura: entra como <strong>a receber</strong> e vira recebido automaticamente no dia do pagamento.
          </div>
        )}
        {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      </div>
    </Modal>
  );
}
