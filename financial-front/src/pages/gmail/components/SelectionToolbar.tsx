import { useEffect, useRef, useState } from 'react';
import { Mail, Tag, Trash2, X } from 'lucide-react';
import type { LabelSummary } from '../../../types/gmail';

type Props = {
  selectedCount: number;
  labels: LabelSummary[];
  onTrash: () => void;
  onMarkUnread: () => void;
  onApplyLabels: (add: string[], remove: string[]) => void;
  onClear: () => void;
  loading?: boolean;
};

export function SelectionToolbar({
  selectedCount,
  labels,
  onTrash,
  onMarkUnread,
  onApplyLabels,
  onClear,
  loading,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) setChecked(new Set());
  }, [pickerOpen]);

  useEffect(() => {
    if (!pickerOpen) return;
    function onDocClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [pickerOpen]);

  if (selectedCount === 0) return null;

  const userLabels = labels
    .filter((l) => l.type === 'user')
    .sort((a, b) => a.name.localeCompare(b.name));

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function apply() {
    onApplyLabels(Array.from(checked), []);
    setPickerOpen(false);
  }

  return (
    <div className="mb-3 flex items-center gap-2 rounded-md bg-accent-soft px-3 py-2 shadow-soft">
      <button
        type="button"
        onClick={onClear}
        className="rounded p-1 text-accent hover:bg-white/50"
        title="Limpar seleção"
        disabled={loading}
      >
        <X className="h-4 w-4" />
      </button>
      <span className="text-sm font-medium text-accent">
        {selectedCount} selecionada{selectedCount === 1 ? '' : 's'}
      </span>
      <div className="ml-auto flex items-center gap-1">
        <div ref={pickerRef} className="relative">
          <button
            type="button"
            onClick={() => setPickerOpen((prev) => !prev)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-accent hover:bg-white/60 disabled:opacity-50"
            title="Aplicar label às selecionadas"
          >
            <Tag className="h-4 w-4" />
            Labels
          </button>
          {pickerOpen && (
            <div className="absolute right-0 top-full mt-1 z-10 w-56 rounded-md border border-slate-200 bg-white shadow-lg">
              <div className="p-2 border-b border-slate-100">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Adicionar label às selecionadas
                </p>
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
                      checked={checked.has(l.id)}
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
                  onClick={() => setPickerOpen(false)}
                  className="rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={apply}
                  disabled={checked.size === 0}
                  className="rounded-md bg-accent px-2 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  Aplicar
                </button>
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onMarkUnread}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-accent hover:bg-white/60 disabled:opacity-50"
          title="Marcar como não-lido"
        >
          <Mail className="h-4 w-4" />
          Não lido
        </button>
        <button
          type="button"
          onClick={onTrash}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          title="Mover para lixeira"
        >
          <Trash2 className="h-4 w-4" />
          Lixeira
        </button>
      </div>
    </div>
  );
}
