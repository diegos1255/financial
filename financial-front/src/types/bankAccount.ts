export type BankAccount = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  createdDate: string;
  updatedDate: string;
};

export type BankAccountRequest = {
  name: string;
  description?: string | null;
};
