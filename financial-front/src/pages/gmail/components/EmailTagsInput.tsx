import { useRef, useState, type KeyboardEvent, type ClipboardEvent } from 'react';
import { X } from 'lucide-react';

type Props = {
  id?: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
};

// Regex simples e prática — mesmo do @Email do Bean Validation cobre a maioria.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Input que aceita emails como "chips". Confirma ao pressionar Enter, virgula ou espaco.
 * Colar multiplos separados por virgula/espaco/quebra de linha vira multiplos chips.
 * Backspace com input vazio remove o ultimo chip.
 */
export function EmailTagsInput({ id, values, onChange, placeholder, disabled }: Props) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function commit(candidate: string): boolean {
    const trimmed = candidate.trim().replace(/[,;]$/, '');
    if (!trimmed) return true;
    if (!EMAIL_REGEX.test(trimmed)) {
      setError(`"${trimmed}" não é um email válido`);
      return false;
    }
    if (values.includes(trimmed)) {
      setDraft('');
      setError(null);
      return true;
    }
    onChange([...values, trimmed]);
    setDraft('');
    setError(null);
    return true;
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';' || e.key === ' ') {
      if (draft.trim()) {
        e.preventDefault();
        commit(draft);
      }
    } else if (e.key === 'Backspace' && draft === '' && values.length > 0) {
      const next = [...values];
      next.pop();
      onChange(next);
    }
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData('text');
    if (!/[,;\s]/.test(text)) return;
    e.preventDefault();
    const parts = text.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
    const next = [...values];
    const invalid: string[] = [];
    for (const p of parts) {
      if (EMAIL_REGEX.test(p) && !next.includes(p)) next.push(p);
      else if (!EMAIL_REGEX.test(p)) invalid.push(p);
    }
    onChange(next);
    setError(invalid.length > 0 ? `Emails inválidos: ${invalid.join(', ')}` : null);
  }

  function onBlur() {
    if (draft.trim()) commit(draft);
  }

  function removeAt(index: number) {
    const next = values.filter((_, i) => i !== index);
    onChange(next);
  }

  return (
    <div>
      <div
        onClick={() => inputRef.current?.focus()}
        className="flex flex-wrap items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2 py-1.5 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent transition-colors cursor-text min-h-[38px]"
      >
        {values.map((email, i) => (
          <span
            key={`${email}-${i}`}
            className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-2 py-0.5 text-xs text-accent"
          >
            <span className="truncate max-w-[220px]">{email}</span>
            <button
              type="button"
              onClick={() => removeAt(i)}
              disabled={disabled}
              className="rounded hover:bg-white/60"
              title="Remover"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onBlur={onBlur}
          disabled={disabled}
          placeholder={values.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
