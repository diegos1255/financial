import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { RotateCcw, Send, Sparkles, X } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { useChatWindowLayout } from './useChatWindowLayout';
import type { ChatMessage as Msg } from '../../types/chat';

type Props = {
  messages: Msg[];
  sending: boolean;
  onClose: () => void;
  onSend: (text: string) => void;
};

export function ChatDrawer({ messages, sending, onClose, onSend }: Props) {
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { layout, startDrag, startResize, reset } = useChatWindowLayout();

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (!sending) textareaRef.current?.focus();
  }, [sending]);

  function handleSend() {
    const trimmed = draft.trim();
    if (!trimmed || sending) return;
    onSend(trimmed);
    setDraft('');
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Assistente"
      style={{
        left: layout.x,
        top: layout.y,
        width: layout.width,
        height: layout.height,
      }}
      className="chat-drawer-anim fixed z-40 flex flex-col overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-2xl"
    >
      {/* Header com gradient + drag handle */}
      <header
        onMouseDown={startDrag}
        className="relative flex items-center justify-between bg-gradient-to-br from-accent to-indigo-600 px-4 py-3 text-white cursor-move select-none"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <h2 className="text-sm font-semibold">Assistente</h2>
            <p className="text-[11px] text-white/80">Perguntas sobre o sistema</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={reset}
            onMouseDown={(e) => e.stopPropagation()}
            title="Restaurar posição e tamanho"
            aria-label="Restaurar layout"
            className="rounded-md p-1.5 text-white/80 hover:bg-white/15 hover:text-white transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            onMouseDown={(e) => e.stopPropagation()}
            title="Fechar (ESC)"
            aria-label="Fechar chat"
            className="rounded-md p-1.5 text-white/80 hover:bg-white/15 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Mensagens */}
      <div
        ref={listRef}
        className="flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-slate-50 to-white px-4 py-4"
      >
        {messages.length === 0 && (
          <div className="mt-8 flex flex-col items-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-accent to-indigo-600 text-white shadow-md">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">Como posso te ajudar?</p>
              <p className="mt-1 text-xs text-slate-500">
                Ex: <em>&quot;como cadastro salário?&quot;</em>
              </p>
            </div>
          </div>
        )}
        {messages.map((m) => (
          <ChatMessage key={m.id} message={m} />
        ))}
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 bg-white p-3">
        <div className="flex items-end gap-2 rounded-xl border border-slate-300 bg-white p-1.5 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent transition-colors">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            maxLength={500}
            placeholder="Faça uma pergunta..."
            disabled={sending}
            className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:opacity-60 max-h-32"
            style={{
              minHeight: '2rem',
              height: 'auto',
            }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !draft.trim()}
            aria-label="Enviar"
            className="rounded-lg bg-gradient-to-br from-accent to-indigo-600 p-2 text-white shadow-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-slate-400">
          <span>Enter enviar · Shift+Enter nova linha · ESC fechar</span>
          <span className={draft.length > 450 ? 'text-orange-500' : ''}>{draft.length}/500</span>
        </div>
      </div>

      {/* Resize handle (canto inferior esquerdo) */}
      <div
        onMouseDown={startResize}
        title="Redimensionar"
        className="absolute bottom-0 left-0 z-10 h-4 w-4 cursor-sw-resize"
        style={{
          background: 'linear-gradient(45deg, transparent 0%, transparent 40%, rgb(148 163 184) 40%, rgb(148 163 184) 45%, transparent 45%, transparent 55%, rgb(148 163 184) 55%, rgb(148 163 184) 60%, transparent 60%)',
        }}
      />
    </div>
  );
}
