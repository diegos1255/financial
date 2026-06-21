import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { investmentService } from '../../services/investmentService';
import { extractApiError } from '../../utils/apiError';
import type { Investment } from '../../types/investment';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: Investment | null;
};

type Payload = { ticker: string; quantity: number; description: string | null };

export function InvestmentFormModal({ open, onClose, onSaved, editing }: Props) {
  const [ticker, setTicker] = useState('');
  const [quantity, setQuantity] = useState('');
  const [description, setDescription] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<Payload | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTicker(editing?.ticker ?? '');
      setQuantity(editing?.quantity != null ? String(editing.quantity) : '');
      setDescription(editing?.description ?? '');
      setConfirming(false);
      setPendingPayload(null);
      setError(null);
    }
  }, [open, editing]);

  function handleSaveClick() {
    setError(null);
    const q = Number(quantity);
    if (!ticker.trim()) return setError('Ticker é obrigatório');
    if (!Number.isInteger(q) || q < 1) return setError('Quantidade deve ser inteiro >= 1');

    const payload: Payload = {
      ticker: ticker.trim().toUpperCase(),
      quantity: q,
      description: description.trim() || null,
    };

    if (editing) {
      doSubmit(payload);
    } else {
      setPendingPayload(payload);
      setConfirming(true);
    }
  }

  async function doSubmit(payload: Payload) {
    setSubmitting(true);
    try {
      if (editing) {
        await investmentService.update(editing.id, payload);
        toast.success('Investimento atualizado');
      } else {
        await investmentService.create(payload);
        toast.success('Investimento criado');
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
      title={confirming ? 'Confirmar cadastro' : editing ? 'Editar investimento' : 'Novo investimento'}
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
      {confirming ? (
        <div className="flex flex-col gap-3 text-sm text-slate-700">
          <p>Confirmar o cadastro do investimento abaixo?</p>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 flex flex-col gap-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Ticker</span>
              <span className="font-semibold">{pendingPayload?.ticker}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Quantidade</span>
              <span className="font-semibold">{pendingPayload?.quantity}</span>
            </div>
            {pendingPayload?.description && (
              <div className="flex justify-between">
                <span className="text-slate-500">Descrição</span>
                <span className="font-semibold">{pendingPayload.description}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Input
            id="inv-ticker"
            label="Ticker"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            maxLength={20}
            placeholder="PETR4"
            autoFocus
          />
          <Input
            id="inv-qty"
            label="Quantidade"
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <Input
            id="inv-desc"
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
