/** "Diego dos Santos Oliveira" -> "DIEGO S OLIVEIRA": primeiro + iniciais do meio (sem preposicoes) + ultimo. */
export function cardHolderName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 2) return parts.join(' ').toUpperCase();
  const middle = parts
    .slice(1, -1)
    .filter((p) => !['de', 'da', 'do', 'das', 'dos', 'e'].includes(p.toLowerCase()))
    .map((p) => p[0]);
  return [parts[0], ...middle, parts[parts.length - 1]].join(' ').toUpperCase();
}
