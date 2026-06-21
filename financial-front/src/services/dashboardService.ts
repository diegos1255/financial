import { api } from './api';
import type { BalanceResponse, CategoryExpense } from '../types/dashboard';

export type DashboardFilters = {
  year?: number;
  month?: number;
};

export const dashboardService = {
  async balance(filters: DashboardFilters = {}): Promise<BalanceResponse> {
    const { data } = await api.get<BalanceResponse>('/api/dashboard/balance', {
      params: filters,
    });
    return data;
  },
  async expensesByCategory(filters: DashboardFilters = {}): Promise<CategoryExpense[]> {
    const { data } = await api.get<CategoryExpense[]>(
      '/api/dashboard/expenses-by-category',
      { params: filters },
    );
    return data;
  },
};
