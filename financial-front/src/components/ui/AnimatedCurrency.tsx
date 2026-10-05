import { useCountUp } from '../../hooks/useCountUp';
import { formatCurrency } from '../../utils/currency';

type Props = {
  value: number;
  /** Mascara do "olhinho" (useValuesVisibility). */
  mask?: (formatted: string) => string;
};

/** Valor em reais que "conta" de 0 ate o valor real (WORK-34). */
export function AnimatedCurrency({ value, mask = (v) => v }: Props) {
  const current = useCountUp(value);
  return <>{mask(formatCurrency(current))}</>;
}
