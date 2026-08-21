import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Search, X } from 'lucide-react';

type Props = {
  value: string;
  onChange: (query: string) => void;
  debounceMs?: number;
};

/**
 * Input de busca com debounce. Notifica onChange com a query final
 * (apos delay) ou com '' quando limpar.
 */
export function SearchBar({ value, onChange, debounceMs = 300 }: Props) {
  const [draft, setDraft] = useState(value);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    if (draft === value) return;
    timerRef.current = window.setTimeout(() => {
      onChange(draft);
    }, debounceMs);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, debounceMs]);

  function clear() {
    setDraft('');
    onChange('');
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      clear();
    }
  }

  return (
    <div className="relative w-72">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder='Buscar (ex: from:contabilidade)'
        className="w-full rounded-md border border-slate-300 bg-white pl-8 pr-8 py-1.5 text-sm text-slate-900 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
      />
      {draft && (
        <button
          type="button"
          onClick={clear}
          title="Limpar busca (ESC)"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
