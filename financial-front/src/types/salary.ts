export type SalaryPayment = {
  id: string;
  paymentDate: string;
  amount: number;
  bankAccountId: string;
  bankAccountName: string;
  description: string | null;
};

export type SalaryMonth = {
  id: string | null;
  referenceYear: number;
  referenceMonth: number;
  expectedAmount: number | null;
  expectedFromInvoice: boolean;
  receivedAmount: number;
  remainingAmount: number | null;
  description: string | null;
  payments: SalaryPayment[];
};

export type SalaryHeaderRequest = {
  expectedAmount: number | null;
  description: string | null;
};

export type SalaryPaymentRequest = {
  paymentDate: string;
  amount: number;
  bankAccountId: string;
  description: string | null;
};
