import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'dashboard-values-visible';
const MASK = '••••••';

/**
 * Hook global de "olhinho" pra esconder/mostrar valores monetarios do dashboard.
 * Default: visivel. Estado persiste em localStorage.
 *
 * Uso:
 *   const { visible, toggle, mask } = useValuesVisibility();
 *   ...
 *   <span>{mask(formatCurrency(x))}</span>
 */
export function useValuesVisibility() {
  const [visible, setVisible] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // default true — se nao tem preferencia salva, mostra
      return raw === null ? true : raw === 'true';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(visible));
    } catch {
      // ignora quota
    }
  }, [visible]);

  const toggle = useCallback(() => setVisible((v) => !v), []);

  const mask = useCallback(
    (formatted: string) => (visible ? formatted : MASK),
    [visible],
  );

  return { visible, toggle, mask };
}
