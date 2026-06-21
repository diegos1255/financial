import { api } from './api';
import type { Salary, SalaryRequest } from '../types/salary';

export type SalaryFilters = {
  year?: number;
  month?: number;
  bankAccountId?: string;
};

export const salaryService = {
  async list(filters: SalaryFilters = {}): Promise<Salary[]> {
    const { data } = await api.get<Salary[]>('/api/salaries', { params: filters });
    return data;
  },
  async create(payload: SalaryRequest): Promise<Salary> {
    const { data } = await api.post<Salary>('/api/salaries', payload);
    return data;
  },
  async update(id: string, payload: SalaryRequest): Promise<Salary> {
    const { data } = await api.put<Salary>(`/api/salaries/${id}`, payload);
    return data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/api/salaries/${id}`);
  },
};
