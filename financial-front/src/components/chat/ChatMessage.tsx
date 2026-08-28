import { Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { ChatMessage as Msg } from '../../types/chat';

type Props = {
  message: Msg;
};

function AssistantAvatar() {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-indigo-600 text-white shadow-sm">
      <Sparkles className="h-3.5 w-3.5" />
    </div>
  );
}

export function ChatMessage({ message }: Props) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-br from-accent to-indigo-600 px-3.5 py-2 text-sm text-white shadow-sm whitespace-pre-wrap break-words">
          {message.content}
        </div>
      </div>
    );
  }

  // assistant
  return (
    <div className="flex justify-start gap-2">
      <AssistantAvatar />
      <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-white border border-slate-200 px-3.5 py-2 text-sm text-slate-900 shadow-sm">
        {message.loading && (
          <div className="flex items-center gap-1 py-1">
            <span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:-0.3s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:-0.15s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-accent" />
          </div>
        )}
        {message.error && (
          <p className="text-red-600">{message.error}</p>
        )}
        {!message.loading && !message.error && (
          <>
            <div className="chat-markdown">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
