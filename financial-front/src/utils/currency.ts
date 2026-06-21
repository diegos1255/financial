const FORMATTER = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function formatCurrency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return FORMATTER.format(value);
}
