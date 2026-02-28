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
  completeOnboarding: (data: Partial<AppUser>) =>
    request<{ data: AppUser }>('/api/app-users/onboarding', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// Entries
export const entriesApi = {
  list: (includeInactive?: boolean) =>
    request<{ data: Entry[] }>(
      `/api/entries${includeInactive ? '?includeInactive=true' : ''}`,
    ),
  get: (id: string) => request<{ data: Entry }>(`/api/entries/${id}`),
  create: (entryDate?: string) =>
    request<{ data: Entry }>('/api/entries', {
      method: 'POST',
      body: JSON.stringify({ entryDate }),
    }),
  update: (id: string, data: Partial<Entry>) =>
    request<{ data: Entry }>(`/api/entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  softDelete: (id: string) =>
    request<void>(`/api/entries/${id}`, { method: 'DELETE' }),
  permanentDelete: (id: string) =>
    request<void>(`/api/entries/${id}/permanent`, { method: 'DELETE' }),
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
  create: (data: { name: string; emoji?: string; color?: string }) =>
    request<{ data: Tag }>('/api/tags', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<Tag>) =>
    request<{ data: Tag }>(`/api/tags/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  softDelete: (id: string) =>
    request<void>(`/api/tags/${id}`, { method: 'DELETE' }),
  getEntryTags: (entryId: string) =>
    request<{ data: Tag[] }>(`/api/entries/${entryId}/tags`),
  addTag: (entryId: string, tagId: string) =>
    request<void>(`/api/entries/${entryId}/tags`, {
      method: 'POST',
      body: JSON.stringify({ tagId }),
    }),
  removeTag: (entryId: string, tagId: string) =>
    request<void>(`/api/entries/${entryId}/tags/${tagId}`, { method: 'DELETE' }),
  setTags: (entryId: string, tagIds: string[]) =>
    request<void>(`/api/entries/${entryId}/tags`, {
      method: 'PUT',
      body: JSON.stringify({ tagIds }),
    }),
};

// Todos
export const todosApi = {
  list: () => request<{ data: Todo[] }>('/api/todos'),
  create: (text: string) =>
    request<{ data: Todo }>('/api/todos', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
  toggle: (id: string) =>
    request<{ data: Todo }>(`/api/todos/${id}/toggle`, { method: 'PUT' }),
  delete: (id: string) =>
    request<void>(`/api/todos/${id}`, { method: 'DELETE' }),
};

// Uploads
export const uploadsApi = {
  getPresignedUrl: (filename: string, contentType: string) =>
    request<{ data: { url: string; key: string } }>('/api/uploads/presigned-url', {
      method: 'POST',
      body: JSON.stringify({ filename, contentType }),
    }),
  complete: (key: string) =>
    request<{ data: { publicUrl: string } }>('/api/uploads/complete', {
      method: 'POST',
      body: JSON.stringify({ key }),
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
  aiTitle?: string;
  isActive: boolean;
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
  isActive: boolean;
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
