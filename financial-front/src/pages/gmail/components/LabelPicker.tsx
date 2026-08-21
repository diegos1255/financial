import { useEffect, useRef, useState } from 'react';
import { Tag } from 'lucide-react';
import type { LabelSummary } from '../../../types/gmail';

type Props = {
  labels: LabelSummary[];
  currentLabelIds: string[];
  onApply: (add: string[], remove: string[]) => void;
  disabled?: boolean;
};

/**
 * Botao "Labels" que abre um popover com checkboxes das labels custom do usuario.
 * Ao aplicar, envia add/remove ao caller.
 */
export function LabelPicker({ labels, currentLabelIds, onApply, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(currentLabelIds));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setSelected(new Set(currentLabelIds));
  }, [open, currentLabelIds]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const userLabels = labels
    .filter((l) => l.type === 'user')
    .sort((a, b) => a.name.localeCompare(b.name));

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function apply() {
    const current = new Set(currentLabelIds);
    const add: string[] = [];
    const remove: string[] = [];
    for (const id of selected) if (!current.has(id)) add.push(id);
    for (const id of current) {
      if (!selected.has(id)) {
        // so remove labels custom (nao mexe em system)
        const label = labels.find((l) => l.id === id);
        if (label && label.type === 'user') remove.push(id);
      }
    }
    onApply(add, remove);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        disabled={disabled}
        title="Aplicar labels"
        className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-accent transition-colors disabled:opacity-50"
      >
        <Tag className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-10 w-56 rounded-md border border-slate-200 bg-white shadow-lg">
          <div className="p-2 border-b border-slate-100">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Labels</p>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {userLabels.length === 0 && (
              <p className="px-3 py-2 text-xs text-slate-500">Nenhuma label custom.</p>
            )}
            {userLabels.map((l) => (
              <label
                key={l.id}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-sm"
              >
                <input
                  type="checkbox"
                  checked={selected.has(l.id)}
                  onChange={() => toggle(l.id)}
                  className="rounded border-slate-300 text-accent focus:ring-accent"
                />
                <span className="truncate text-slate-700">{l.name}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2 p-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={apply}
              className="rounded-md bg-accent px-2 py-1 text-xs font-medium text-white hover:opacity-90"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
