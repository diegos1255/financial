export type SeverancePayment = {
  id: string;
  paymentDate: string;
  amount: number;
  bankAccountId: string;
  bankAccountName: string;
  description: string | null;
};

export type Severance = {
  id: string | null;
  totalAmount: number | null;
  receivedAmount: number;
  remainingAmount: number | null;
  paymentsCount: number;
  description: string | null;
  payments: SeverancePayment[];
};

export type SeveranceHeaderRequest = {
  totalAmount: number | null;
  description: string | null;
};

export type SeverancePaymentRequest = {
  paymentDate: string;
  amount: number;
  bankAccountId: string;
  description: string | null;
};
