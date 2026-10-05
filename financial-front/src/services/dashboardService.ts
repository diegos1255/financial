import { api } from './api';
import type { BalanceResponse, CategoryExpense, MonthEvolution, MonthExpenseItem } from '../types/dashboard';

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
  async evolution(filters: DashboardFilters & { months?: number } = {}): Promise<MonthEvolution[]> {
    const { data } = await api.get<MonthEvolution[]>('/api/dashboard/evolution', { params: filters });
    return data;
  },
  async monthExpenses(filters: DashboardFilters = {}): Promise<MonthExpenseItem[]> {
    const { data } = await api.get<MonthExpenseItem[]>('/api/dashboard/month-expenses', { params: filters });
    return data;
  },
};
