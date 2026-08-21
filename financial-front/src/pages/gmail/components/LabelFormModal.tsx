import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { gmailService } from '../../../services/gmailService';
import { extractApiError } from '../../../utils/apiError';
import type { LabelSummary } from '../../../types/gmail';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: LabelSummary | null;
};

export function LabelFormModal({ open, onClose, onSaved, editing }: Props) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? '');
    setError(null);
  }, [open, editing]);

  async function handleSubmit() {
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) return setError('Nome é obrigatório');
    setSubmitting(true);
    try {
      if (editing) {
        await gmailService.renameLabel(editing.id, trimmed);
        toast.success('Label renomeada');
      } else {
        await gmailService.createLabel(trimmed);
        toast.success('Label criada');
      }
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
      open={open}
      onClose={submitting ? () => {} : onClose}
      title={editing ? 'Renomear label' : 'Nova label'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Input
          id="label-name"
          label="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          placeholder="Ex: Impostos"
          autoFocus
        />
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
