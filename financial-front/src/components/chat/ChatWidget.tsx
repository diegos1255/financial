import { useEffect, useState } from 'react';
import { ChatBubble } from './ChatBubble';
import { ChatDrawer } from './ChatDrawer';
import { chatService } from '../../services/chatService';
import { extractApiError } from '../../utils/apiError';
import type { ChatMessage } from '../../types/chat';

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Root do widget do chat: bolinha bottom-right + drawer que sobe da direita.
 * Nao renderiza nada se o backend responder que o chat esta desabilitado
 * (sem GEMINI_API_KEY). Historico dura so a sessao (state em memoria).
 */
export function ChatWidget() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    chatService.isEnabled().then((e) => {
      if (!cancelled) setEnabled(e);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSend(text: string) {
    const userMsg: ChatMessage = { id: uid(), role: 'user', content: text };
    const placeholder: ChatMessage = {
      id: uid(),
      role: 'assistant',
      content: '',
      loading: true,
    };
    setMessages((prev) => [...prev, userMsg, placeholder]);
    setSending(true);

    try {
      const answer = await chatService.query(text);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholder.id
            ? {
                ...m,
                content: answer.answer,
                sources: answer.sources,
                loading: false,
              }
            : m,
        ),
      );
    } catch (err) {
      const msg = extractApiError(err, 'Falha ao consultar assistente.');
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholder.id
            ? { ...m, content: '', error: msg, loading: false }
            : m,
        ),
      );
    } finally {
      setSending(false);
    }
  }

  if (!enabled) return null;

  return (
    <>
      <ChatBubble open={open} onClick={() => setOpen((prev) => !prev)} />
      {open && (
        <ChatDrawer
          messages={messages}
          sending={sending}
          onClose={() => setOpen(false)}
          onSend={handleSend}
        />
      )}
    </>
  );
}
