import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Download, X } from 'lucide-react';
import { gmailService } from '../../../services/gmailService';
import { extractApiError } from '../../../utils/apiError';
import type { AttachmentSummary } from '../../../types/gmail';

type Props = {
  open: boolean;
  messageId: string;
  attachment: AttachmentSummary | null;
  onClose: () => void;
};

export function AttachmentPreviewModal({ open, messageId, attachment, onClose }: Props) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !attachment) {
      setObjectUrl(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    gmailService
      .downloadAttachment(messageId, attachment.id, attachment.filename, attachment.mimeType)
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setObjectUrl(url);
      })
      .catch((err) => {
        if (!cancelled) toast.error(extractApiError(err, 'Falha ao carregar preview.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, messageId, attachment]);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  function handleDownload() {
    if (!attachment || !objectUrl) return;
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = attachment.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  if (!open || !attachment) return null;

  const isImage = attachment.mimeType.startsWith('image/');
  const isPdf = attachment.mimeType === 'application/pdf';

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-slate-900/90 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex items-center justify-between px-4 py-2 text-white">
        <p className="truncate text-sm">{attachment.filename}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!objectUrl}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm hover:bg-white/10 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Baixar
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 hover:bg-white/10"
            title="Fechar (ESC)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center overflow-hidden px-4 pb-4">
        {loading && <p className="text-sm text-white/80">Carregando...</p>}
        {!loading && objectUrl && isImage && (
          <img
            src={objectUrl}
            alt={attachment.filename}
            className="max-h-full max-w-full object-contain"
          />
        )}
        {!loading && objectUrl && isPdf && (
          <iframe
            src={objectUrl}
            title={attachment.filename}
            className="h-full w-full max-w-6xl rounded-md bg-white"
          />
        )}
      </div>
    </div>
  );
}
