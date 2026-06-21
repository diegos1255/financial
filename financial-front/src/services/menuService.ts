import { api } from './api';
import type { Menu } from '../types/menu';

export const menuService = {
  async getMenus(): Promise<Menu[]> {
    const { data } = await api.get<Menu[]>('/api/menus');
    return data;
  },
};
