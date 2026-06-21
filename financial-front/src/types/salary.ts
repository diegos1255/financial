export type Salary = {
  id: string;
  bankAccountId: string;
  bankAccountName: string;
  referenceYear: number;
  referenceMonth: number;
  amount: number;
  description: string | null;
  createdDate: string;
  updatedDate: string;
};

export type SalaryRequest = {
  bankAccountId: string;
  referenceYear: number;
  referenceMonth: number;
  amount: number;
  description?: string | null;
};
