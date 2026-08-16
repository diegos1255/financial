import DOMPurify from 'dompurify';
import type { MessageDetail, ThreadDetail } from '../../../types/gmail';

type Props = {
  thread: ThreadDetail;
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
    </div>
  );
}

export function ThreadViewer({ thread }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-slate-900">{thread.subject}</h2>
      {thread.messages.map((m) => (
        <MessageCard key={m.id} message={m} />
      ))}
    </div>
  );
}
