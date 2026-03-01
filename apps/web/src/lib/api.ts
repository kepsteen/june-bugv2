const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// App Users
export const appUsersApi = {
  getMe: () => request<{ data: AppUser }>('/api/app-users/me'),
  getOnboardingStatus: () =>
    request<{ data: { isOnboarded: boolean; user: AppUser | null } }>(
      '/api/app-users/onboarding/status',
    ),
  completeOnboarding: (data: { payload: Partial<AppUser> }) =>
    request<{ data: AppUser }>('/api/app-users/onboarding', {
      method: 'PUT',
      body: JSON.stringify(data.payload),
    }),
};

// Entries
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

// Tags
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

// Todos
export const todosApi = {
  list: () => request<{ data: Todo[] }>('/api/todos'),
  create: (data: { payload: { text: string } }) =>
    request<{ data: Todo }>('/api/todos', {
      method: 'POST',
      body: JSON.stringify(data.payload),
    }),
  toggle: (id: string) =>
    request<{ data: Todo }>(`/api/todos/${id}/toggle`, { method: 'PUT' }),
  delete: (id: string) =>
    request<void>(`/api/todos/${id}`, { method: 'DELETE' }),
};

// Uploads
export const uploadsApi = {
  getPresignedUrl: (data: { payload: { filename: string; contentType: string } }) =>
    request<{ data: { url: string; key: string } }>('/api/uploads/presigned-url', {
      method: 'POST',
      body: JSON.stringify(data.payload),
    }),
  complete: (data: { payload: { key: string } }) =>
    request<{ data: { publicUrl: string } }>('/api/uploads/complete', {
      method: 'POST',
      body: JSON.stringify(data.payload),
    }),
};

// Types
export interface AppUser {
  id: string;
  authId: string;
  email?: string;
  isOnboarded: boolean;
  fullName?: string;
  age?: number;
  currentRole?: string;
  experienceLevel?: string;
  mentorshipStyle?: string;
  developmentGoals?: string[];
  techStack?: string[];
  workEnvironment?: string;
  journalingFrequency?: string;
  customScheduleDays?: string[];
  journalingTime?: string;
  notificationPreferences?: string[];
  createdAt: string;
  updatedAt: string;
}

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

export interface Tag {
  id: string;
  userId?: string;
  name: string;
  isSystemGenerated: boolean;
  emoji?: string;
  color?: string;
  createdAt: string;
}

export interface Todo {
  id: string;
  userId: string;
  text: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}
