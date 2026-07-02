import { request } from './client';

export interface Tag {
  id: string;
  userId?: string;
  name: string;
  isSystemGenerated: boolean;
  emoji?: string;
  color?: string;
  createdAt: string;
}

export const tagsApi = {
  list: () => request<{ data: Tag[] }>('/api/tags'),
  create: (data: { payload: { name: string; emoji?: string; color?: string } }) =>
    request<{ data: Tag }>('/api/tags', {
      method: 'POST',
      body: JSON.stringify(data.payload),
    }),
  update: (data: { id: string; payload: Partial<Tag> }) =>
    request<{ data: Tag }>(`/api/tags/${data.id}`, {
      method: 'PUT',
      body: JSON.stringify(data.payload),
    }),
  delete: (id: string) =>
    request<void>(`/api/tags/${id}`, { method: 'DELETE' }),
  getEntryTags: (entryId: string) =>
    request<{ data: Tag[] }>(`/api/entries/${entryId}/tags`),
  addTag: (data: { entryId: string; payload: { tagId: string } }) =>
    request<void>(`/api/entries/${data.entryId}/tags`, {
      method: 'POST',
      body: JSON.stringify(data.payload),
    }),
  removeTag: (data: { entryId: string; tagId: string }) =>
    request<void>(`/api/entries/${data.entryId}/tags/${data.tagId}`, { method: 'DELETE' }),
  setTags: (data: { entryId: string; payload: { tagIds: string[] } }) =>
    request<void>(`/api/entries/${data.entryId}/tags`, {
      method: 'PUT',
      body: JSON.stringify(data.payload),
    }),
};
