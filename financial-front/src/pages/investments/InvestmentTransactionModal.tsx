import { useState } from 'react';
import toast from 'react-hot-toast';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { investmentService } from '../../services/investmentService';
import { extractApiError } from '../../utils/apiError';
import { celebrateSuccess } from '../../utils/celebrate';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { todayLocal } from './localDate';
import type { Investment } from '../../types/investment';

// Montado so enquanto aberto: o estado inicial vem das props.
type Props = {
  investments: Investment[];
  defaultInvestmentId?: string;
  onClose: () => void;
  onSaved: () => void;
};

/** Registrar compra/venda de cotas (WORK-36): a quantidade do ativo passa a vir daqui. */
export function InvestmentTransactionModal({ investments, defaultInvestmentId, onClose, onSaved }: Props) {
  const today = todayLocal();
  const [investmentId, setInvestmentId] = useState(defaultInvestmentId ?? investments[0]?.id ?? '');
  const [type, setType] = useState<'BUY' | 'SELL'>('BUY');
  const [tradeDate, setTradeDate] = useState(today);
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const investment = investments.find((i) => i.id === investmentId);
  const qty = Number(quantity);
  const total = unitPrice && Number.isInteger(qty) && qty > 0 ? unitPrice * qty : null;

  function validationError(): string | null {
    if (!investment) return 'Selecione o ativo';
    if (!tradeDate || tradeDate > today) return 'Informe uma data até hoje';
    if (!Number.isInteger(qty) || qty < 1) return 'Quantidade deve ser um inteiro maior que zero';
    if (type === 'SELL' && qty > investment.quantity) return `Você tem ${investment.quantity} cotas de ${investment.ticker}`;
    if (!unitPrice || unitPrice <= 0) return 'Informe o preço por cota';
    return null;
  }

  function handleSave() {
    const message = validationError();
    setError(message);
    if (!message) setConfirming(true);
  }

  async function doSubmit() {
    setSubmitting(true);
    try {
      await investmentService.addTransaction(investmentId, { type, tradeDate, quantity: qty, unitPrice });
      if (type === 'BUY') {
        toast.success('Aporte registrado');
        celebrateSuccess(4000);
      } else {
        toast.success('Venda registrada');
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
      open
      onClose={submitting ? () => {} : onClose}
      title={confirming ? 'Confirmar aporte' : 'Registrar aporte'}
      footer={
        confirming ? (
          <>
            <Button variant="ghost" onClick={() => setConfirming(false)} disabled={submitting}>
              Voltar
            </Button>
            <Button onClick={doSubmit} disabled={submitting}>
              {submitting ? 'Salvando...' : 'Confirmar'}
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={submitting}>
              Salvar
            </Button>
          </>
        )
      }
    >
      {confirming && investment ? (
        <div className="flex flex-col gap-2 text-sm text-slate-700">
          <p>{type === 'BUY' ? 'Confirmar a compra abaixo?' : 'Confirmar a venda abaixo?'}</p>
          <ul className="mt-1 space-y-1 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
            <li><span className="text-slate-500">Ativo:</span> <strong>{investment.ticker}</strong></li>
            <li><span className="text-slate-500">Data:</span> <strong>{formatDate(tradeDate)}</strong></li>
            <li><span className="text-slate-500">Cotas:</span> <strong>{qty}</strong> × {formatCurrency(unitPrice ?? 0)}</li>
            <li><span className="text-slate-500">Total:</span> <strong>{formatCurrency(total ?? 0)}</strong></li>
            <li>
              <span className="text-slate-500">Posição:</span> {investment.quantity} →{' '}
              <strong>{type === 'BUY' ? investment.quantity + qty : investment.quantity - qty}</strong> cotas
            </li>
          </ul>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Select id="tx-inv" label="Ativo" value={investmentId} onChange={(e) => setInvestmentId(e.target.value)}>
            {investments.map((i) => (
              <option key={i.id} value={i.id}>
                {i.ticker} ({i.quantity} cotas)
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo">
            {(['BUY', 'SELL'] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={type === t}
                onClick={() => setType(t)}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  type === t
                    ? t === 'BUY'
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                      : 'border-red-300 bg-red-50 text-red-700'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {t === 'BUY' ? 'Compra' : 'Venda'}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input id="tx-date" label="Data" type="date" value={tradeDate} max={today} onChange={(e) => setTradeDate(e.target.value)} />
            <Input id="tx-qty" label="Quantidade de cotas" type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <CurrencyInput id="tx-price" label="Preço por cota" value={unitPrice} onChange={setUnitPrice} />
          {total !== null && (
            <p className="-mt-2 text-sm text-slate-500">
              Total da operação: <strong className="text-slate-800">{formatCurrency(total)}</strong>
            </p>
          )}
          {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        </div>
      )}
    </Modal>
  );
}
