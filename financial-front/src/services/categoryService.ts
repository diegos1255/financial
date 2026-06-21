import { api } from './api';
import type { Category, CategoryRequest } from '../types/category';
import type { PageResponse } from '../types/page';

export const categoryService = {
  async list(params?: {
    q?: string;
    includeInactive?: boolean;
    page?: number;
    size?: number;
  }): Promise<PageResponse<Category>> {
    const { data } = await api.get<PageResponse<Category>>('/api/categories', { params });
    return data;
  },

  async listAll(): Promise<Category[]> {
    const { data } = await api.get<Category[]>('/api/categories/all');
    return data;
  },

  async create(payload: CategoryRequest): Promise<Category> {
    const { data } = await api.post<Category>('/api/categories', payload);
    return data;
  },

  async update(id: string, payload: CategoryRequest): Promise<Category> {
    const { data } = await api.put<Category>(`/api/categories/${id}`, payload);
    return data;
  },

  async setActive(id: string, active: boolean): Promise<Category> {
    const { data } = await api.patch<Category>(`/api/categories/${id}/active`, { active });
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/api/categories/${id}`);
  },
};
