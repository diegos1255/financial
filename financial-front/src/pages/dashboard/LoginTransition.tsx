import { useEffect, useState } from 'react';
import happyMascot from '../../assets/mascots/saldo-positivo.svg';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

type Props = {
  firstName: string;
  /** Recem-cadastrado: "Bem-vindo" em vez de "Bem-vindo de volta". */
  firstVisit?: boolean;
  onDone: () => void;
};

// 4 s: Diego quer tempo para ver a transicao (D-3).
const TOTAL_MS = 4000;
const FADE_MS = 350;

/**
 * Transicao em tela cheia logo apos o login (WORK-34, D-2). O dashboard carrega os dados
 * por tras e so monta o conteudo quando ela termina, para a cascata aparecer.
 */
export function LoginTransition({ firstName, firstVisit, onDone }: Props) {
  const reducedMotion = usePrefersReducedMotion();
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (reducedMotion) {
      const frame = requestAnimationFrame(onDone);
      return () => cancelAnimationFrame(frame);
    }
    const fade = setTimeout(() => setLeaving(true), TOTAL_MS - FADE_MS);
    const done = setTimeout(onDone, TOTAL_MS);
    return () => {
      clearTimeout(fade);
      clearTimeout(done);
    };
  }, [reducedMotion, onDone]);

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 transition-opacity duration-300 ${leaving ? 'opacity-0' : 'opacity-100'}`}
      role="status"
      aria-live="polite"
    >
      {/* brilhos decorativos */}
      <span className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10" aria-hidden />
      <span className="pointer-events-none absolute -bottom-32 -left-20 h-[28rem] w-[28rem] rounded-full bg-white/5" aria-hidden />

      <div className="relative flex flex-col items-center text-center text-white motion-safe:animate-fade-up">
        <img
          src={happyMascot}
          alt=""
          className="mb-6 h-48 w-auto select-none drop-shadow-[0_18px_24px_rgba(30,0,60,0.35)]"
          draggable={false}
        />
        <h1 className="text-3xl font-semibold">
          {firstVisit ? `Bem-vindo, ${firstName}!` : `Bem-vindo de volta, ${firstName}!`}
        </h1>
        <p className="mt-2 flex items-end gap-2 text-base text-white/85">
          Preparando seu mês
          {/* "cobrinha": um ponto pula de cada vez. Atraso inline: a classe animate-* (shorthand)
              zerava um animation-delay vindo de classe. 360 ms = duracao do pulo (30% de 1,2 s). */}
          <span className="mb-1.5 inline-flex gap-1.5" aria-hidden>
            {[0, 360, 720].map((delay) => (
              <span
                key={delay}
                className="h-2 w-2 rounded-full bg-white motion-safe:animate-dot-hop"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </span>
        </p>
      </div>
    </div>
  );
}
