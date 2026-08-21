import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { EmailTagsInput } from './EmailTagsInput';
import { gmailService } from '../../../services/gmailService';
import { extractApiError } from '../../../utils/apiError';

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
    }
  }, [open]);

  const hasContent =
    to.length > 0 || cc.length > 0 || bcc.length > 0 || subject.trim() !== '' || body.trim() !== '';

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
    setSending(true);
    try {
      await gmailService.sendMessage({
        to,
        cc: cc.length > 0 ? cc : undefined,
        bcc: bcc.length > 0 ? bcc : undefined,
        subject: subject.trim(),
        body,
      });
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
