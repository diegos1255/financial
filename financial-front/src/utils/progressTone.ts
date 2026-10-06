// Cor do "quanto ja entrou" por PORCENTAGEM do total (WORK-35, D-6): funciona para qualquer
// valor de salario/rescisao. Ate 33% vermelho, ate 70% laranja, acima verde.
// Sem total informado nao ha porcentagem: cor neutra.
export function progressTone(received: number, total: number | null | undefined) {
  if (!total || total <= 0) return { text: 'text-slate-900', bar: 'bg-slate-400' };
  const ratio = received / total;
  if (ratio <= 0.33) return { text: 'text-red-600', bar: 'bg-red-500' };
  if (ratio <= 0.7) return { text: 'text-orange-600', bar: 'bg-orange-500' };
  return { text: 'text-emerald-600', bar: 'bg-emerald-500' };
}
