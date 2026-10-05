import { api } from './api';
import type { Severance, SeveranceHeaderRequest, SeverancePaymentRequest } from '../types/severance';

export const severanceService = {
  async get(): Promise<Severance> {
    const { data } = await api.get<Severance>('/api/severance');
    return data;
  },
  async updateHeader(payload: SeveranceHeaderRequest): Promise<Severance> {
    const { data } = await api.put<Severance>('/api/severance', payload);
    return data;
  },
  async addPayment(payload: SeverancePaymentRequest): Promise<Severance> {
    const { data } = await api.post<Severance>('/api/severance/payments', payload);
    return data;
  },
  async updatePayment(id: string, payload: SeverancePaymentRequest): Promise<Severance> {
    const { data } = await api.put<Severance>(`/api/severance/payments/${id}`, payload);
    return data;
  },
  async removePayment(id: string): Promise<Severance> {
    const { data } = await api.delete<Severance>(`/api/severance/payments/${id}`);
    return data;
  },
};
