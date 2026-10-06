export type BalanceBreakdown = {
  fixed: number;
  installments: number;
  installmentsPaid: number;
  installmentsPending: number;
  variable: number;
};

export type BalanceResponse = {
  year: number;
  month: number;
  salary: number;
  totalExpenses: number;
  /** Impostos PJ do mes anterior, ja descontados do saldo (WORK-35). */
  pjTaxes: number;
  balance: number;
  breakdown: BalanceBreakdown;
};

export type CategoryExpense = {
  categoryId: string;
  categoryName: string;
  color: string | null;
  total: number;
};

export type MonthEvolution = {
  year: number;
  month: number;
  salary: number;
  totalExpenses: number;
  pjTaxes: number;
  balance: number;
};

export type MonthExpenseItem = {
  /** EXPENSE = despesa; PJ_TAX = imposto PJ do mes anterior (sem `type`). */
  kind: 'EXPENSE' | 'PJ_TAX';
  expenseId: string;
  description: string;
  categoryName: string;
  categoryColor: string | null;
  type: 'FIXED' | 'INSTALLMENT' | 'VARIABLE' | null;
  date: string | null;
  amount: number;
  installmentLabel: string | null;
};
