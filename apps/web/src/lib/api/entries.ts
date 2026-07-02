import { request } from './client';

export interface Entry {
  id: string;
  userId: string;
  entryDate: string;
  content: string;
  plainText?: string;
  Title?: string;
  createdAt: string;
  updatedAt: string;
}

export const entriesApi = {
  list: () => request<{ data: Entry[] }>('/api/entries'),
  get: (id: string) => request<{ data: Entry }>(`/api/entries/${id}`),
  create: (data: { payload: { entryDate?: string } }) =>
    request<{ data: Entry }>('/api/entries', {
      method: 'POST',
      body: JSON.stringify(data.payload),
    }),
  createTitle: (data: { id: string; payload: { content: string } }) =>
    request<{ data: Entry }>(`/api/entries/${data.id}/title`, {
      method: 'POST',
      body: JSON.stringify(data.payload),
    }),
  update: (data: { id: string; payload: Partial<Entry> }) =>
    request<{ data: Entry }>(`/api/entries/${data.id}`, {
      method: 'PUT',
      body: JSON.stringify(data.payload),
    }),
  delete: (id: string) =>
    request<void>(`/api/entries/${id}`, { method: 'DELETE' }),
  search: (q: string) =>
    request<{ data: Entry[] }>(`/api/entries/search?q=${encodeURIComponent(q)}`),
  getByRange: (start: string, end: string) =>
    request<{ data: Entry[] }>(
      `/api/entries/range?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
    ),
};
