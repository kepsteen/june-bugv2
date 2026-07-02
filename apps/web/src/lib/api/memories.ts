import type { MemoryCategory, MemoryStatus, MemoryTier } from '@starter/shared';
import { request } from './client';

export type { MemoryCategory, MemoryStatus, MemoryTier };

export interface UserMemory {
  id: string;
  userId: string;
  category: MemoryCategory;
  tier: MemoryTier;
  title: string;
  summary: string;
  evidenceEntryId?: string | null;
  canonicalKey?: string | null;
  confidence: number;
  importance: number;
  firstSeenAt: string;
  lastSeenAt: string;
  status: MemoryStatus;
  source: 'onboarding' | 'entry' | 'system';
  goalId?: string | null;
  projectName?: string | null;
  impactType?: string | null;
  impactSummary?: string | null;
  milestoneState?: 'planned' | 'in_progress' | 'completed' | 'blocked' | null;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
}

export const memoriesApi = {
  list: (params?: { category?: MemoryCategory; status?: MemoryStatus }) => {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.status) searchParams.set('status', params.status);
    const query = searchParams.toString();
    return request<{ data: UserMemory[] }>(`/api/memories${query ? `?${query}` : ''}`);
  },
  delete: (id: string) => request<void>(`/api/memories/${id}`, { method: 'DELETE' }),
  deleteMany: (params?: { category?: MemoryCategory; status?: MemoryStatus }) => {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.status) searchParams.set('status', params.status);
    const query = searchParams.toString();
    return request<void>(`/api/memories${query ? `?${query}` : ''}`, { method: 'DELETE' });
  },
};
