// Faixas fixas do valor recebido no mes (WORK-30, D-5) — independem do total da NF.
export function salaryTone(received: number) {
  if (received <= 5000) return { text: 'text-red-600', bar: 'bg-red-500' };
  if (received <= 10000) return { text: 'text-orange-600', bar: 'bg-orange-500' };
  return { text: 'text-emerald-600', bar: 'bg-emerald-500' };
}
