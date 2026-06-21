import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { bankAccountService } from '../../services/bankAccountService';
import { extractApiError } from '../../utils/apiError';
import type { BankAccount } from '../../types/bankAccount';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: BankAccount | null;
};

type Payload = { name: string; description: string | null };

export function BankAccountFormModal({ open, onClose, onSaved, editing }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<Payload | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? '');
      setDescription(editing?.description ?? '');
      setConfirming(false);
      setPendingPayload(null);
      setError(null);
    }
  }, [open, editing]);

  function handleSaveClick() {
    setError(null);
    if (!name.trim()) {
      setError('Nome é obrigatório');
      return;
    }
    const payload: Payload = { name: name.trim(), description: description.trim() || null };
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
        await bankAccountService.update(editing.id, payload);
        toast.success('Conta atualizada');
      } else {
        await bankAccountService.create(payload);
        toast.success('Conta criada');
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
      title={confirming ? 'Confirmar cadastro' : editing ? 'Editar conta bancária' : 'Nova conta bancária'}
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
        <p className="text-sm text-slate-700">
          Confirmar o cadastro da conta bancária <strong>{pendingPayload?.name}</strong>?
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <Input
            id="bank-name"
            label="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            autoFocus
          />
          <Input
            id="bank-desc"
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
