import { api } from './api';
import type {
  Investment,
  InvestmentIncome,
  InvestmentIncomeRequest,
  InvestmentPortfolioResponse,
  InvestmentRequest,
  InvestmentTransaction,
  InvestmentTransactionRequest,
  PortfolioHistory,
} from '../types/investment';
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

  // ---- WORK-36 ----
  async listTransactions(id: string): Promise<InvestmentTransaction[]> {
    const { data } = await api.get<InvestmentTransaction[]>(`/api/investments/${id}/transactions`);
    return data;
  },

  async addTransaction(id: string, payload: InvestmentTransactionRequest): Promise<InvestmentTransaction> {
    const { data } = await api.post<InvestmentTransaction>(`/api/investments/${id}/transactions`, payload);
    return data;
  },

  async removeTransaction(transactionId: string): Promise<void> {
    await api.delete(`/api/investments/transactions/${transactionId}`);
  },

  async listIncomes(id: string): Promise<InvestmentIncome[]> {
    const { data } = await api.get<InvestmentIncome[]>(`/api/investments/${id}/incomes`);
    return data;
  },

  async addIncome(id: string, payload: InvestmentIncomeRequest): Promise<InvestmentIncome> {
    const { data } = await api.post<InvestmentIncome>(`/api/investments/${id}/incomes`, payload);
    return data;
  },

  async removeIncome(incomeId: string): Promise<void> {
    await api.delete(`/api/investments/incomes/${incomeId}`);
  },

  async history(months = 12): Promise<PortfolioHistory> {
    const { data } = await api.get<PortfolioHistory>('/api/investments/history', { params: { months } });
    return data;
  },
};
