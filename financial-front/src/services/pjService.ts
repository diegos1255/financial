import { api } from './api';
import type { PjEntry, PjEntryRequest } from '../types/pj';

function buildFormData(payload: PjEntryRequest, file: File | null): FormData {
  const form = new FormData();
  form.append('type', payload.type);
  form.append('year', String(payload.year));
  form.append('month', String(payload.month));
  form.append('amount', String(payload.amount));
  if (file) form.append('file', file);
  return form;
}

export const pjService = {
  async list(params?: { year?: number; month?: number }): Promise<PjEntry[]> {
    const { data } = await api.get<PjEntry[]>('/api/pj-entries', { params });
    return data;
  },

  async create(payload: PjEntryRequest, file: File): Promise<PjEntry> {
    const { data } = await api.post<PjEntry>('/api/pj-entries', buildFormData(payload, file));
    return data;
  },

  async update(id: string, payload: PjEntryRequest, file: File | null): Promise<PjEntry> {
    const { data } = await api.put<PjEntry>(`/api/pj-entries/${id}`, buildFormData(payload, file));
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/api/pj-entries/${id}`);
  },

  async download(id: string, fileName: string): Promise<void> {
    const response = await api.get(`/api/pj-entries/${id}/download`, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
