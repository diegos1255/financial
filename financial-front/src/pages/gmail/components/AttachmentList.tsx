import { useState } from 'react';
import toast from 'react-hot-toast';
import { Download, Eye, File, FileImage, FileText, FileVideo, Paperclip } from 'lucide-react';
import { gmailService } from '../../../services/gmailService';
import { extractApiError } from '../../../utils/apiError';
import { AttachmentPreviewModal } from './AttachmentPreviewModal';
import type { AttachmentSummary } from '../../../types/gmail';

type Props = {
  messageId: string;
  attachments: AttachmentSummary[];
};

function iconFor(mime: string) {
  if (mime.startsWith('image/')) return FileImage;
  if (mime === 'application/pdf') return FileText;
  if (mime.startsWith('video/')) return FileVideo;
  if (mime.startsWith('text/')) return FileText;
  return File;
}

function formatSize(bytes: number | null): string {
  if (bytes == null || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function canPreview(mime: string): boolean {
  return mime === 'application/pdf' || mime.startsWith('image/');
}

export function AttachmentList({ messageId, attachments }: Props) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [preview, setPreview] = useState<AttachmentSummary | null>(null);

  if (attachments.length === 0) return null;

  async function handleDownload(att: AttachmentSummary) {
    setDownloading(att.id);
    try {
      const blob = await gmailService.downloadAttachment(
        messageId,
        att.id,
        att.filename,
        att.mimeType,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = att.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      toast.error(extractApiError(err, 'Falha ao baixar anexo.'));
    } finally {
      setDownloading(null);
    }
  }

  return (
    <>
      <div className="mt-3 border-t border-slate-100 pt-3">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <Paperclip className="h-3.5 w-3.5" />
          {attachments.length} anexo{attachments.length === 1 ? '' : 's'}
        </div>
        <div className="flex flex-wrap gap-2">
          {attachments.map((att) => {
            const Icon = iconFor(att.mimeType);
            const size = formatSize(att.size);
            return (
              <div
                key={att.id}
                className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm max-w-full"
              >
                <Icon className="h-4 w-4 shrink-0 text-slate-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-slate-800" title={att.filename}>{att.filename}</p>
                  {size && <p className="text-[10px] text-slate-500">{size}</p>}
                </div>
                {canPreview(att.mimeType) && (
                  <button
                    type="button"
                    onClick={() => setPreview(att)}
                    title="Visualizar"
                    className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-accent"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDownload(att)}
                  disabled={downloading === att.id}
                  title="Baixar"
                  className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-accent disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <AttachmentPreviewModal
        open={preview !== null}
        messageId={messageId}
        attachment={preview}
        onClose={() => setPreview(null)}
      />
    </>
  );
}
