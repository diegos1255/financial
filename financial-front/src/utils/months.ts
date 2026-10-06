export const MONTHS = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
];

export function monthLabel(month: number): string {
  return MONTHS.find((m) => m.value === month)?.label ?? String(month);
}

export function yearRange(from: number, to: number): number[] {
  const out: number[] = [];
  for (let y = from; y <= to; y++) out.push(y);
  return out;
}

/** Nome do mes deslocado (ex.: shiftedMonthLabel(1, -1) = "Dezembro"). NF de um mes paga o salario do mes seguinte (WORK-35). */
export function shiftedMonthLabel(month: number, delta: number): string {
  const index = (((month - 1 + delta) % 12) + 12) % 12;
  return MONTHS[index].label;
}
