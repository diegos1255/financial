import { useEffect, useState } from 'react';

type Props = {
  /** 0..100 */
  percent: number;
  /** Classe de cor da barra (ex.: "bg-red-500"). */
  barClass: string;
  /** Classes do trilho (altura/largura). */
  className?: string;
};

/** Barra de progresso que se enche ao aparecer (WORK-34). Transicao desligada com "Reduzir movimento" (motion-safe). */
export function FillBar({ percent, barClass, className = 'h-2 flex-1' }: Props) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    // Um frame com largura 0 antes de aplicar o valor: e o que faz a transicao "encher".
    const frame = requestAnimationFrame(() => setShown(percent));
    return () => cancelAnimationFrame(frame);
  }, [percent]);

  return (
    <div
      className={`overflow-hidden rounded-full bg-slate-100 ${className}`}
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full motion-safe:transition-[width] motion-safe:duration-[1500ms] motion-safe:ease-out ${barClass}`}
        style={{ width: `${shown}%` }}
      />
    </div>
  );
}
