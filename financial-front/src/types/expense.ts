export type ExpenseType = 'FIXED' | 'INSTALLMENT' | 'VARIABLE';
export type ExpenseStatus = 'ACTIVE' | 'CANCELLED';
export type InstallmentStatus = 'PENDING' | 'PAID' | 'CANCELLED' | 'ANTICIPATED';

export type Ref = { id: string; name: string };

export type Installment = {
  id: string;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  status: InstallmentStatus;
  paidAt: string | null;
};

export type Expense = {
  id: string;
  description: string;
  totalAmount: number;
  expenseType: ExpenseType;
  status: ExpenseStatus;
  purchaseDate: string;
  firstDueDate: string | null;
  installmentsCount: number | null;
  cancelledAt: string | null;
  category: Ref;
  bankAccount: Ref;
  installments: Installment[] | null;
  createdDate: string;
  updatedDate: string;
};

export type ExpenseRequest = {
  description: string;
  totalAmount: number;
  expenseType: ExpenseType;
  installmentsCount?: number | null;
  purchaseDate: string;
  firstDueDate?: string | null;
  categoryId: string;
  bankAccountId: string;
};

export type ExpenseUpdateRequest = {
  description: string;
  categoryId: string;
  bankAccountId: string;
};
