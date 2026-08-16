import { api } from './api';
import type {
  BulkActionResponse,
  GmailAuthUrl,
  GmailBulkAction,
  GmailCategory,
  GmailStatus,
  PagedThreadsResponse,
  ThreadDetail,
  UnreadSummary,
} from '../types/gmail';

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

  async listThreads(
    category: GmailCategory,
    pageToken?: string,
    pageSize = 20,
  ): Promise<PagedThreadsResponse> {
    const { data } = await api.get<PagedThreadsResponse>('/api/gmail/threads', {
      params: { category, pageToken, pageSize },
    });
    return data;
  },

  async getThread(id: string): Promise<ThreadDetail> {
    const { data } = await api.get<ThreadDetail>(`/api/gmail/threads/${id}`);
    return data;
  },

  async markThreadAsRead(id: string): Promise<void> {
    await api.post(`/api/gmail/threads/${id}/read`);
  },

  async getUnreadSummary(): Promise<UnreadSummary | null> {
    try {
      const { data } = await api.get<UnreadSummary>('/api/gmail/unread-summary');
      return data;
    } catch (err) {
      const anyErr = err as { response?: { status?: number } };
      if (anyErr.response?.status === 404) return null;
      throw err;
    }
  },

  async archiveThread(id: string): Promise<void> {
    await api.post(`/api/gmail/threads/${id}/archive`);
  },

  async trashThread(id: string): Promise<void> {
    await api.post(`/api/gmail/threads/${id}/trash`);
  },

  async markThreadAsUnread(id: string): Promise<void> {
    await api.post(`/api/gmail/threads/${id}/unread`);
  },

  async bulkAction(action: GmailBulkAction, threadIds: string[]): Promise<BulkActionResponse> {
    const { data } = await api.post<BulkActionResponse>('/api/gmail/threads/bulk', {
      action,
      threadIds,
    });
    return data;
  },
};
