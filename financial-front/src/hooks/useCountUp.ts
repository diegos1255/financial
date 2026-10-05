import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Anima um numero ate `target` (WORK-34). Sempre que o alvo muda, conta a partir
 * do valor exibido no momento (na 1a vez, de zero). Com "Reduzir movimento", pula direto.
 */
export function useCountUp(target: number, durationMs = 1500): number {
  const reducedMotion = usePrefersReducedMotion();
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0);

  useEffect(() => {
    const from = displayRef.current;
    let frame = 0;
    let start: number | null = null;

    const step = (now: number) => {
      if (start === null) start = now;
      const t = reducedMotion ? 1 : Math.min(1, (now - start) / durationMs);
      const value = from + (target - from) * easeOutCubic(t);
      displayRef.current = value;
      setDisplay(value);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, reducedMotion]);

  return display;
}
