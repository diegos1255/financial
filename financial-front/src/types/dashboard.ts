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
  balance: number;
};

export type MonthExpenseItem = {
  expenseId: string;
  description: string;
  categoryName: string;
  categoryColor: string | null;
  type: 'FIXED' | 'INSTALLMENT' | 'VARIABLE';
  date: string | null;
  amount: number;
  installmentLabel: string | null;
};
