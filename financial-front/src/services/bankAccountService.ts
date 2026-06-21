import { api } from './api';
import type { BankAccount, BankAccountRequest } from '../types/bankAccount';
import type { PageResponse } from '../types/page';

export const bankAccountService = {
  async list(params?: {
    q?: string;
    includeInactive?: boolean;
    page?: number;
    size?: number;
  }): Promise<PageResponse<BankAccount>> {
    const { data } = await api.get<PageResponse<BankAccount>>('/api/bank-accounts', { params });
    return data;
  },

  async listAll(): Promise<BankAccount[]> {
    const { data } = await api.get<BankAccount[]>('/api/bank-accounts/all');
    return data;
  },

  async create(payload: BankAccountRequest): Promise<BankAccount> {
    const { data } = await api.post<BankAccount>('/api/bank-accounts', payload);
    return data;
  },

  async update(id: string, payload: BankAccountRequest): Promise<BankAccount> {
    const { data } = await api.put<BankAccount>(`/api/bank-accounts/${id}`, payload);
    return data;
  },

  async setActive(id: string, active: boolean): Promise<BankAccount> {
    const { data } = await api.patch<BankAccount>(`/api/bank-accounts/${id}/active`, { active });
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/api/bank-accounts/${id}`);
  },
};
