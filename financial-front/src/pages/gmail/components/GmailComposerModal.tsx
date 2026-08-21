import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import toast from 'react-hot-toast';
import { Paperclip, X } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { EmailTagsInput } from './EmailTagsInput';
import { gmailService } from '../../../services/gmailService';
import { extractApiError } from '../../../utils/apiError';

const MAX_ATTACHMENTS_BYTES = 25 * 1024 * 1024;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Props = {
  open: boolean;
  onClose: () => void;
  onSent?: () => void;
};

export function GmailComposerModal({ open, onClose, onSent }: Props) {
  const [to, setTo] = useState<string[]>([]);
  const [cc, setCc] = useState<string[]>([]);
  const [bcc, setBcc] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [sending, setSending] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [discardConfirm, setDiscardConfirm] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTo([]);
      setCc([]);
      setBcc([]);
      setSubject('');
      setBody('');
      setShowCc(false);
      setShowBcc(false);
      setValidationError(null);
      setDiscardConfirm(false);
      setFiles([]);
    }
  }, [open]);

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);

  const hasContent =
    to.length > 0 || cc.length > 0 || bcc.length > 0 || subject.trim() !== '' || body.trim() !== '' || files.length > 0;

  function onFilesPicked(e: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;
    const merged = [...files, ...picked];
    const total = merged.reduce((sum, f) => sum + f.size, 0);
    if (total > MAX_ATTACHMENTS_BYTES) {
      setValidationError(`Anexos totalizam ${formatSize(total)}, limite do Gmail é 25MB`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setFiles(merged);
    setValidationError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeFile(index: number) {
    setFiles(files.filter((_, i) => i !== index));
  }

  function tryClose() {
    if (sending) return;
    if (!hasContent) {
      onClose();
      return;
    }
    setDiscardConfirm(true);
  }

  function confirmDiscard() {
    setDiscardConfirm(false);
    onClose();
  }

  async function handleSend() {
    setValidationError(null);
    if (to.length === 0) {
      setValidationError('Adicione pelo menos um destinatário');
      return;
    }
    if (!subject.trim()) {
      setValidationError('Assunto é obrigatório');
      return;
    }
    if (!body.trim()) {
      setValidationError('Corpo do email é obrigatório');
      return;
    }
    if (totalBytes > MAX_ATTACHMENTS_BYTES) {
      setValidationError(`Anexos excedem 25MB (total: ${formatSize(totalBytes)})`);
      return;
    }
    setSending(true);
    try {
      await gmailService.sendMessage(
        {
          to,
          cc: cc.length > 0 ? cc : undefined,
          bcc: bcc.length > 0 ? bcc : undefined,
          subject: subject.trim(),
          body,
        },
        files.length > 0 ? files : undefined,
      );
      toast.success('Email enviado');
      onSent?.();
      onClose();
    } catch (err) {
      toast.error(extractApiError(err, 'Falha ao enviar email.'));
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Modal
        open={open && !discardConfirm}
        onClose={tryClose}
        title="Novo email"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={tryClose} disabled={sending}>
              Cancelar
            </Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending ? 'Enviando...' : 'Enviar'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <div>
            <label htmlFor="composer-to" className="mb-1 block text-xs font-medium text-slate-600">
              Para
            </label>
            <EmailTagsInput
              id="composer-to"
              values={to}
              onChange={setTo}
              placeholder="email@exemplo.com"
              disabled={sending}
            />
            <div className="mt-1 flex gap-3 text-xs">
              {!showCc && (
                <button
                  type="button"
                  onClick={() => setShowCc(true)}
                  className="text-slate-500 hover:text-accent"
                >
                  Adicionar Cc
                </button>
              )}
              {!showBcc && (
                <button
                  type="button"
                  onClick={() => setShowBcc(true)}
                  className="text-slate-500 hover:text-accent"
                >
                  Adicionar Bcc
                </button>
              )}
            </div>
          </div>

          {showCc && (
            <div>
              <label htmlFor="composer-cc" className="mb-1 block text-xs font-medium text-slate-600">
                Cc
              </label>
              <EmailTagsInput
                id="composer-cc"
                values={cc}
                onChange={setCc}
                placeholder="cc@exemplo.com"
                disabled={sending}
              />
            </div>
          )}

          {showBcc && (
            <div>
              <label htmlFor="composer-bcc" className="mb-1 block text-xs font-medium text-slate-600">
                Bcc
              </label>
              <EmailTagsInput
                id="composer-bcc"
                values={bcc}
                onChange={setBcc}
                placeholder="bcc@exemplo.com"
                disabled={sending}
              />
            </div>
          )}

          <div>
            <label htmlFor="composer-subject" className="mb-1 block text-xs font-medium text-slate-600">
              Assunto
            </label>
            <input
              id="composer-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
              disabled={sending}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
            />
          </div>

          <div>
            <label htmlFor="composer-body" className="mb-1 block text-xs font-medium text-slate-600">
              Mensagem
            </label>
            <textarea
              id="composer-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              disabled={sending}
              className="w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={onFilesPicked}
                disabled={sending}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <Paperclip className="h-3.5 w-3.5" />
                Anexar arquivo
              </button>
              {files.length > 0 && (
                <span className="text-xs text-slate-500">
                  {files.length} arquivo{files.length === 1 ? '' : 's'} · {formatSize(totalBytes)} / 25MB
                </span>
              )}
            </div>
            {files.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <span
                    key={`${f.name}-${i}`}
                    className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700"
                  >
                    <span className="truncate max-w-[240px]" title={f.name}>{f.name}</span>
                    <span className="text-slate-500">({formatSize(f.size)})</span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      disabled={sending}
                      className="rounded hover:bg-slate-200"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {validationError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {validationError}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={discardConfirm}
        onClose={() => setDiscardConfirm(false)}
        title="Descartar rascunho?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDiscardConfirm(false)}>
              Continuar editando
            </Button>
            <Button onClick={confirmDiscard}>Descartar</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">Você digitou algo. Tem certeza que quer descartar?</p>
      </Modal>
    </>
  );
}
