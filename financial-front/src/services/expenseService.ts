import { api } from './api';
import type {
  Expense,
  ExpenseRequest,
  ExpenseStatus,
  ExpenseUpdateRequest,
  Installment,
} from '../types/expense';

export type ExpenseFilters = {
  year?: number;
  month?: number;
  status?: ExpenseStatus;
  categoryId?: string;
  bankAccountId?: string;
};

export const expenseService = {
  async list(filters: ExpenseFilters = {}): Promise<Expense[]> {
    const { data } = await api.get<Expense[]>('/api/expenses', { params: filters });
    return data;
  },
  async get(id: string): Promise<Expense> {
    const { data } = await api.get<Expense>(`/api/expenses/${id}`);
    return data;
  },
  async create(payload: ExpenseRequest): Promise<Expense> {
    const { data } = await api.post<Expense>('/api/expenses', payload);
    return data;
  },
  async update(id: string, payload: ExpenseUpdateRequest): Promise<Expense> {
    const { data } = await api.put<Expense>(`/api/expenses/${id}`, payload);
    return data;
  },
  async cancel(id: string): Promise<void> {
    await api.post(`/api/expenses/${id}/cancel`);
  },
  async listInstallments(id: string): Promise<Installment[]> {
    const { data } = await api.get<Installment[]>(`/api/expenses/${id}/installments`);
    return data;
  },
};
