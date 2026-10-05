// Faixas fixas do valor recebido da rescisao (WORK-31, D-3).
export function severanceTone(received: number) {
  if (received <= 15000) return { text: 'text-red-600', bar: 'bg-red-500' };
  if (received <= 28000) return { text: 'text-orange-600', bar: 'bg-orange-500' };
  return { text: 'text-emerald-600', bar: 'bg-emerald-500' };
}
