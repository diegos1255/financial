import type { ReactNode } from 'react';

type Props = {
  /** Atraso da entrada em ms (cascata). */
  delay?: number;
  className?: string;
  children: ReactNode;
};

/** Entrada suave (sobe e aparece) para montar a cascata do dashboard (WORK-34). Desligada com "Reduzir movimento". */
export function Reveal({ delay = 0, className = '', children }: Props) {
  return (
    <div className={`motion-safe:animate-fade-up ${className}`} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}
