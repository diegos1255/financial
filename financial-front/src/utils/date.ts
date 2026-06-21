import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function formatDate(iso: string | null | undefined, pattern = 'dd/MM/yyyy'): string {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), pattern, { locale: ptBR });
  } catch {
    return iso;
  }
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
