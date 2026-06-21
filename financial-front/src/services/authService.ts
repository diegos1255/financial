import { api } from './api';
import type { LoginRequest, LoginResponse, SignupRequest, User } from '../types/user';

export const authService = {
  async login(payload: LoginRequest): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>('/api/auth/login', payload);
    return data;
  },

  async signup(payload: SignupRequest): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>('/api/auth/signup', payload);
    return data;
  },

  async logout(): Promise<void> {
    await api.post('/api/auth/logout');
  },

  async me(): Promise<User> {
    const { data } = await api.get<User>('/api/users/me');
    return data;
  },

  async uploadPhoto(file: File): Promise<User> {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.patch<User>('/api/users/me/photo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};
