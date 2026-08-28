import { Sparkles, X } from 'lucide-react';

type Props = {
  open: boolean;
  onClick: () => void;
};

/**
 * Botao flutuante que abre o chat. Usa Sparkles (padrao Notion AI, Copilot,
 * Gemini) pra indicar que eh assistente IA — nao um chat de suporte comum.
 * Trocar o icone eh 1 linha: importar outro do lucide-react (ver Bot,
 * BrainCircuit, Wand2, MessageCircle) e substituir abaixo.
 */
export function ChatBubble({ open, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={open ? 'Fechar assistente' : 'Abrir assistente'}
      title={open ? 'Fechar assistente' : 'Perguntar ao assistente'}
      className={[
        'fixed bottom-5 right-5 z-40',
        'flex h-14 w-14 items-center justify-center rounded-full',
        'bg-gradient-to-br from-accent to-indigo-600',
        'text-white shadow-lg ring-1 ring-white/20',
        'transition-all duration-200 hover:scale-105 hover:shadow-xl',
        'active:scale-95',
      ].join(' ')}
    >
      {open ? (
        <X className="h-6 w-6" />
      ) : (
        <Sparkles className="h-6 w-6 drop-shadow" />
      )}
    </button>
  );
}
