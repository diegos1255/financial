import { api } from './api';
import type { Investment, InvestmentPortfolioResponse, InvestmentRequest } from '../types/investment';
import type { PageResponse } from '../types/page';

export const investmentService = {
  async list(params?: {
    q?: string;
    includeInactive?: boolean;
    page?: number;
    size?: number;
  }): Promise<PageResponse<Investment>> {
    const { data } = await api.get<PageResponse<Investment>>('/api/investments', { params });
    return data;
  },

  async listAll(): Promise<Investment[]> {
    const { data } = await api.get<Investment[]>('/api/investments/all');
    return data;
  },

  async getPortfolio(): Promise<InvestmentPortfolioResponse> {
    const { data } = await api.get<InvestmentPortfolioResponse>('/api/investments/portfolio');
    return data;
  },

  async create(payload: InvestmentRequest): Promise<Investment> {
    const { data } = await api.post<Investment>('/api/investments', payload);
    return data;
  },

  async update(id: string, payload: InvestmentRequest): Promise<Investment> {
    const { data } = await api.put<Investment>(`/api/investments/${id}`, payload);
    return data;
  },

  async setActive(id: string, active: boolean): Promise<Investment> {
    const { data } = await api.patch<Investment>(`/api/investments/${id}/active`, { active });
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/api/investments/${id}`);
  },
};
