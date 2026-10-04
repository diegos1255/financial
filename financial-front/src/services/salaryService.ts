import { api } from './api';
import type { SalaryHeaderRequest, SalaryMonth, SalaryPaymentRequest } from '../types/salary';

export const salaryService = {
  async getMonth(year: number, month: number): Promise<SalaryMonth> {
    const { data } = await api.get<SalaryMonth>(`/api/salaries/${year}/${month}`);
    return data;
  },
  async updateHeader(year: number, month: number, payload: SalaryHeaderRequest): Promise<SalaryMonth> {
    const { data } = await api.put<SalaryMonth>(`/api/salaries/${year}/${month}`, payload);
    return data;
  },
  async addPayment(year: number, month: number, payload: SalaryPaymentRequest): Promise<SalaryMonth> {
    const { data } = await api.post<SalaryMonth>(`/api/salaries/${year}/${month}/payments`, payload);
    return data;
  },
  async updatePayment(id: string, payload: SalaryPaymentRequest): Promise<SalaryMonth> {
    const { data } = await api.put<SalaryMonth>(`/api/salaries/payments/${id}`, payload);
    return data;
  },
  async removePayment(id: string): Promise<SalaryMonth> {
    const { data } = await api.delete<SalaryMonth>(`/api/salaries/payments/${id}`);
    return data;
  },
};
