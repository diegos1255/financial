import type { ThreadSummary } from '../../../types/gmail';

type Props = {
  thread: ThreadSummary;
  selected: boolean;
  onClick: () => void;
};

function formatDate(iso: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    if (sameDay) {
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  } catch {
    return '';
  }
}

function extractFromName(from: string): string {
  if (!from) return '(sem remetente)';
  const match = from.match(/^"?([^"<]+?)"?\s*<.+>$/);
  return match ? match[1].trim() : from;
}

export function ThreadListItem({ thread, selected, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'w-full text-left px-4 py-3 border-b border-slate-100 transition-colors',
        selected ? 'bg-accent-soft' : thread.unread ? 'bg-blue-50/40 hover:bg-slate-50' : 'bg-white hover:bg-slate-50',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={[
            'truncate text-sm',
            thread.unread ? 'font-semibold text-slate-900' : 'text-slate-700',
          ].join(' ')}
        >
          {extractFromName(thread.from)}
          {thread.messageCount > 1 && (
            <span className="ml-1 text-xs text-slate-500">({thread.messageCount})</span>
          )}
        </span>
        <span className="shrink-0 text-xs text-slate-500 tabular-nums">
          {formatDate(thread.date)}
        </span>
      </div>
      <div
        className={[
          'mt-1 truncate text-sm',
          thread.unread ? 'font-medium text-slate-800' : 'text-slate-600',
        ].join(' ')}
      >
        {thread.subject || '(sem assunto)'}
      </div>
      {thread.snippet && (
        <div className="mt-1 truncate text-xs text-slate-500">{thread.snippet}</div>
      )}
    </button>
  );
}
