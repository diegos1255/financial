import { api } from './api';
import type { ChatAnswer, ChatStatus } from '../types/chat';

export const chatService = {
  async isEnabled(): Promise<boolean> {
    try {
      const { data } = await api.get<ChatStatus>('/api/chat/status');
      return data.enabled;
    } catch {
      return false;
    }
  },

  async query(question: string): Promise<ChatAnswer> {
    const { data } = await api.post<ChatAnswer>('/api/chat/query', { question });
    return data;
  },
};
