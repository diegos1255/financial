import { useEffect, useRef, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import toast from 'react-hot-toast';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { categoryService } from '../../services/categoryService';
import { extractApiError } from '../../utils/apiError';
import type { Category } from '../../types/category';

const DEFAULT_COLOR = '#6366f1';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: Category | null;
};

type Payload = { name: string; description: string | null; color: string };

export function CategoryFormModal({ open, onClose, onSaved, editing }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<Payload | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? '');
      setDescription(editing?.description ?? '');
      setColor(editing?.color ?? DEFAULT_COLOR);
      setPickerOpen(false);
      setConfirming(false);
      setPendingPayload(null);
      setError(null);
    }
  }, [open, editing]);

  useEffect(() => {
    if (!pickerOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [pickerOpen]);

  function handleSaveClick() {
    setError(null);
    if (!name.trim()) {
      setError('Nome é obrigatório');
      return;
    }
    const payload: Payload = {
      name: name.trim(),
      description: description.trim() || null,
      color,
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
        await categoryService.update(editing.id, payload);
        toast.success('Categoria atualizada');
      } else {
        await categoryService.create(payload);
        toast.success('Categoria criada');
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
      title={confirming ? 'Confirmar cadastro' : editing ? 'Editar categoria' : 'Nova categoria'}
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
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-700">
            Confirmar o cadastro da categoria <strong>{pendingPayload?.name}</strong>?
          </p>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span
              className="inline-block h-4 w-4 rounded-full border border-slate-200 shadow-sm"
              style={{ backgroundColor: pendingPayload?.color }}
            />
            <span className="font-mono text-xs text-slate-500">{pendingPayload?.color}</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Input
            id="cat-name"
            label="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            autoFocus
          />
          <Input
            id="cat-desc"
            label="Descrição (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={255}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Cor</label>
            <div className="flex items-center gap-3">
              <div className="relative" ref={pickerRef}>
                <button
                  type="button"
                  onClick={() => setPickerOpen((v) => !v)}
                  className="h-8 w-8 rounded-full border-2 border-slate-300 shadow-sm transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                  style={{ backgroundColor: color }}
                  aria-label="Escolher cor"
                />
                {pickerOpen && (
                  <div className="absolute left-0 top-10 z-50 rounded-xl shadow-xl">
                    <HexColorPicker color={color} onChange={setColor} />
                  </div>
                )}
              </div>
              <span className="font-mono text-xs text-slate-500">{color}</span>
            </div>
          </div>
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
