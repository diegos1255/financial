import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { pjService } from '../../services/pjService';
import { extractApiError } from '../../utils/apiError';
import { MONTHS, yearRange } from '../../utils/months';
import { PJ_TYPE_LABELS, PJ_TYPE_ORDER } from '../../types/pj';
import type { PjEntry, PjEntryType } from '../../types/pj';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: PjEntry | null;
};

const NOW = new Date();
const YEARS = yearRange(NOW.getFullYear() - 5, NOW.getFullYear() + 1);
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

export function PjEntryFormModal({ open, onClose, onSaved, editing }: Props) {
  const [type, setType] = useState<PjEntryType>('INVOICE');
  const [year, setYear] = useState<number>(NOW.getFullYear());
  const [month, setMonth] = useState<number>(NOW.getMonth() + 1);
  const [amount, setAmount] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setType(editing.type);
      setYear(editing.year);
      setMonth(editing.month);
      setAmount(editing.amount);
    } else {
      setType('INVOICE');
      setYear(NOW.getFullYear());
      setMonth(NOW.getMonth() + 1);
      setAmount(null);
    }
    setFile(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [open, editing]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    if (!selected) {
      setFile(null);
      return;
    }
    if (!ALLOWED_TYPES.includes(selected.type)) {
      setError('Somente PDF, JPG e PNG são aceitos');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (selected.size > MAX_SIZE_BYTES) {
      setError('Arquivo deve ter no máximo 5MB');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setError(null);
    setFile(selected);
  }

  async function handleSubmit() {
    setError(null);
    const value = amount ?? 0;
    if (value <= 0) return setError('Valor deve ser maior que zero');
    if (!editing && !file) return setError('Anexe um arquivo (PDF, JPG ou PNG)');

    setSubmitting(true);
    try {
      const payload = { type, year, month, amount: value };
      if (editing) {
        await pjService.update(editing.id, payload, file);
        toast.success('Lançamento atualizado');
      } else {
        await pjService.create(payload, file!);
        toast.success('Lançamento criado');
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
      title={editing ? 'Editar lançamento PJ' : 'Novo lançamento PJ'}
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
      <div className="flex flex-col gap-4">
        <Select
          label="Tipo"
          value={type}
          onChange={(e) => setType(e.target.value as PjEntryType)}
          disabled={submitting}
        >
          {PJ_TYPE_ORDER.map((t) => (
            <option key={t} value={t}>
              {PJ_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Mês"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            disabled={submitting}
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
          <Select
            label="Ano"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            disabled={submitting}
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </div>

        <CurrencyInput
          label="Valor"
          value={amount}
          onChange={setAmount}
          disabled={submitting}
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="pj-file" className="text-sm font-medium text-slate-700">
            Arquivo (PDF, JPG ou PNG — máx 5MB)
          </label>
          <input
            id="pj-file"
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            onChange={handleFileChange}
            disabled={submitting}
            className="text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-accent-soft file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-accent hover:file:bg-accent-soft/70"
          />
          {editing && !file && (
            <span className="text-xs text-slate-500">
              Atual: <span className="font-medium">{editing.fileName}</span> — anexe um novo arquivo para substituir.
            </span>
          )}
          {file && (
            <span className="text-xs text-emerald-700">
              Novo: <span className="font-medium">{file.name}</span> ({(file.size / 1024).toFixed(1)} KB)
            </span>
          )}
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
