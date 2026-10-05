import type { ReactNode } from 'react';
import { formatCurrency } from '../../utils/currency';
import { monthLabel } from '../../utils/months';
import happyMascot from '../../assets/mascots/saldo-positivo.svg';
import sadMascot from '../../assets/mascots/saldo-negativo.svg';
import type { BalanceResponse } from '../../types/dashboard';
import type { SalaryMonth } from '../../types/salary';

type Props = {
  firstName: string;
  year: number;
  month: number;
  balance: BalanceResponse | null;
  salaryMonth: SalaryMonth | null;
  loading: boolean;
  visible: boolean;
  actions: ReactNode;
};

type Mood = 'happy' | 'sad' | null;

// Madrugada (0h-4h59) ainda e "boa noite".
function greeting(now: Date): string {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

// Frase-resumo do mes (WORK-32, D-7). Com valores ocultos nao entrega nem o sinal do saldo.
function summary(
  balance: BalanceResponse | null,
  salaryMonth: SalaryMonth | null,
  monthName: string,
  loading: boolean,
  visible: boolean,
): { text: ReactNode; mood: Mood } {
  if (loading || !balance) return { text: 'Carregando o resumo do mês...', mood: null };
  if (!visible) return { text: 'Valores ocultos. Clique no olhinho para ver o resumo do mês.', mood: null };

  const money = (v: number) => <strong className="font-semibold text-slate-900">{formatCurrency(v)}</strong>;

  if (balance.salary === 0 && balance.totalExpenses === 0) {
    return { text: `Nenhum lançamento em ${monthName} ainda.`, mood: null };
  }
  if (balance.balance >= 0) {
    return { text: <>Mandou bem! Sobraram {money(balance.balance)} em {monthName}.</>, mood: 'happy' };
  }

  const expected = salaryMonth?.expectedAmount ?? null;
  const missing = expected !== null ? expected - balance.salary : 0;
  if (missing > 0) {
    return {
      text: (
        <>
          Você está {money(Math.abs(balance.balance))} no vermelho em {monthName} — ainda faltam{' '}
          {money(missing)} do salário entrar.
        </>
      ),
      mood: 'sad',
    };
  }
  return {
    text: <>Atenção: os gastos de {monthName} passaram das entradas em {money(Math.abs(balance.balance))}.</>,
    mood: 'sad',
  };
}

export function DashboardHero({ firstName, year, month, balance, salaryMonth, loading, visible, actions }: Props) {
  const monthName = monthLabel(month).toLowerCase();
  const { text, mood } = summary(balance, salaryMonth, monthName, loading, visible);

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-100 from-0% via-indigo-50 via-35% to-white to-60% px-6 pt-5 shadow-soft">
      <div className="flex items-stretch justify-between gap-4">
        <div className="min-w-0 pb-5">
          <h1 className="text-2xl font-semibold text-slate-900">
            {greeting(new Date())}, {firstName} 👋
          </h1>
          <p className="mt-0.5 text-sm font-medium text-accent">
            {monthLabel(month)}/{year}
          </p>
          <p className="mt-3 max-w-3xl text-base text-slate-600">{text}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end justify-between gap-2">
          <div className="flex items-center gap-2">{actions}</div>
          {/* Caixa de altura fixa: a faixa nao muda de tamanho entre feliz, triste ou sem boneco. */}
          <div className="mr-2 hidden h-28 items-end sm:flex">
            {mood && (
              <img
                src={mood === 'happy' ? happyMascot : sadMascot}
                alt={mood === 'happy' ? 'Boneco comemorando' : 'Boneco triste'}
                // O feliz tem confete e braços pra cima: precisa de mais altura pro corpo ficar do tamanho do triste.
                className={`${mood === 'happy' ? 'h-28' : 'h-24'} w-auto select-none`}
                draggable={false}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
