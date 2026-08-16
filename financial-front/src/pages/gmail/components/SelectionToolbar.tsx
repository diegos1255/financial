import { Mail, Trash2, X } from 'lucide-react';

type Props = {
  selectedCount: number;
  onTrash: () => void;
  onMarkUnread: () => void;
  onClear: () => void;
  loading?: boolean;
};

export function SelectionToolbar({
  selectedCount,
  onTrash,
  onMarkUnread,
  onClear,
  loading,
}: Props) {
  if (selectedCount === 0) return null;

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
