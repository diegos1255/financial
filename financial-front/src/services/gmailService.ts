import { api } from './api';
import type { GmailAuthUrl, GmailStatus } from '../types/gmail';

export const gmailService = {
  async getStatus(): Promise<GmailStatus> {
    const { data } = await api.get<GmailStatus>('/api/gmail/status');
    return data;
  },

  async getAuthUrl(): Promise<GmailAuthUrl> {
    const { data } = await api.get<GmailAuthUrl>('/api/gmail/auth-url');
    return data;
  },

  async disconnect(): Promise<void> {
    await api.delete('/api/gmail/disconnect');
  },
};
