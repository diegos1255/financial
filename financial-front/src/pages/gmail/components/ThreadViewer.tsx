import DOMPurify from 'dompurify';
import { Mail, Trash2 } from 'lucide-react';
import { LabelPicker } from './LabelPicker';
import { AttachmentList } from './AttachmentList';
import type { LabelSummary, MessageDetail, ThreadDetail } from '../../../types/gmail';

type Props = {
  thread: ThreadDetail;
  labels: LabelSummary[];
  onTrash: () => void;
  onMarkUnread: () => void;
  onApplyLabels: (add: string[], remove: string[]) => void;
  loading?: boolean;
};

function formatDateTime(iso: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function MessageCard({ message }: { message: MessageDetail }) {
  const sanitized = DOMPurify.sanitize(message.bodyHtml, {
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'link'],
    FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover'],
  });

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">{message.from}</p>
          {message.to.length > 0 && (
            <p className="mt-0.5 truncate text-xs text-slate-500">
              Para: {message.to.join(', ')}
            </p>
          )}
          {message.cc.length > 0 && (
            <p className="mt-0.5 truncate text-xs text-slate-500">
              Cc: {message.cc.join(', ')}
            </p>
          )}
        </div>
        <span className="shrink-0 text-xs text-slate-500 tabular-nums">
          {formatDateTime(message.date)}
        </span>
      </div>
      <div
        className="prose prose-sm max-w-none text-sm text-slate-800 [&_a]:text-accent [&_img]:max-w-full"
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
      {message.attachments && message.attachments.length > 0 && (
        <AttachmentList messageId={message.id} attachments={message.attachments} />
      )}
    </div>
  );
}

export function ThreadViewer({ thread, labels, onTrash, onMarkUnread, onApplyLabels, loading }: Props) {
  // Coleta labels ativas em todas as mensagens da thread
  const threadLabelIds = new Set<string>();
  thread.messages.forEach((m) => m.labelIds.forEach((id) => threadLabelIds.add(id)));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <h2 className="flex-1 text-lg font-semibold text-slate-900">{thread.subject}</h2>
        <div className="flex shrink-0 items-center gap-1">
          <LabelPicker
            labels={labels}
            currentLabelIds={Array.from(threadLabelIds)}
            onApply={onApplyLabels}
            disabled={loading}
          />
          <button
            type="button"
            onClick={onMarkUnread}
            disabled={loading}
            title="Marcar como não-lido"
            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-accent transition-colors disabled:opacity-50"
          >
            <Mail className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onTrash}
            disabled={loading}
            title="Mover para lixeira"
            className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      {thread.messages.map((m) => (
        <MessageCard key={m.id} message={m} />
      ))}
    </div>
  );
}
