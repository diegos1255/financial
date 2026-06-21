import { api } from './api';
import type { Installment } from '../types/expense';

export const installmentService = {
  async markPaid(id: string, paidAt?: string): Promise<Installment> {
    const { data } = await api.patch<Installment>(`/api/installments/${id}/pay`,
      paidAt ? { paidAt } : {}
    );
    return data;
  },
  async markPending(id: string): Promise<Installment> {
    const { data } = await api.patch<Installment>(`/api/installments/${id}/unpay`);
    return data;
  },
};
