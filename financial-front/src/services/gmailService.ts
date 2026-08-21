import { api } from './api';
import type {
  BulkActionResponse,
  GmailAuthUrl,
  GmailBulkAction,
  GmailCategory,
  GmailStatus,
  LabelSummary,
  PagedThreadsResponse,
  SendMessageRequest,
  SendMessageResponse,
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

  async listThreadsByLabel(
    labelId: string,
    pageToken?: string,
    pageSize = 20,
  ): Promise<PagedThreadsResponse> {
    const { data } = await api.get<PagedThreadsResponse>('/api/gmail/threads', {
      params: { labelId, pageToken, pageSize },
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

  async listLabels(includeStats = false): Promise<LabelSummary[]> {
    const { data } = await api.get<LabelSummary[]>('/api/gmail/labels', {
      params: { includeStats },
    });
    return data;
  },

  async createLabel(name: string): Promise<LabelSummary> {
    const { data } = await api.post<LabelSummary>('/api/gmail/labels', { name });
    return data;
  },

  async renameLabel(id: string, newName: string): Promise<LabelSummary> {
    const { data } = await api.patch<LabelSummary>(`/api/gmail/labels/${id}`, { newName });
    return data;
  },

  async deleteLabel(id: string): Promise<void> {
    await api.delete(`/api/gmail/labels/${id}`);
  },

  async modifyThreadLabels(threadId: string, add: string[], remove: string[]): Promise<void> {
    await api.post(`/api/gmail/threads/${threadId}/labels`, { add, remove });
  },

  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    const { data } = await api.post<SendMessageResponse>('/api/gmail/messages/send', request);
    return data;
  },

  async searchThreads(
    query: string,
    pageToken?: string,
    pageSize = 20,
  ): Promise<PagedThreadsResponse> {
    const { data } = await api.get<PagedThreadsResponse>('/api/gmail/search', {
      params: { q: query, pageToken, pageSize },
    });
    return data;
  },
};
