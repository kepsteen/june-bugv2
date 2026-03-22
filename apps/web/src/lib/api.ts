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

// Memories
export const memoriesApi = {
  list: (params?: { category?: MemoryCategory; status?: MemoryStatus }) => {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.status) searchParams.set('status', params.status);
    const query = searchParams.toString();
    return request<{ data: UserMemory[] }>(`/api/memories${query ? `?${query}` : ''}`);
  },
  delete: (id: string) => request<void>(`/api/memories/${id}`, { method: 'DELETE' }),
};

// Prompts
export const promptsApi = {
  getPersonalized: (data: {
    payload: { entryId: string; focusCategory?: MemoryCategory; entryDraft?: string };
  }) =>
    request<{ data: PersonalizedPromptsResult }>('/api/prompts/personalized', {
      method: 'POST',
      body: JSON.stringify(data.payload),
    }),
  regeneratePersonalized: (data: {
    payload: { entryId: string; focusCategory?: MemoryCategory; entryDraft?: string };
  }) =>
    request<{ data: PersonalizedPromptsResult }>('/api/prompts/personalized/regenerate', {
      method: 'POST',
      body: JSON.stringify(data.payload),
    }),
};

// Observability
export const observabilityApi = {
  getAiOverview: (hours?: number) =>
    request<{ data: AiOverview }>(`/api/internal/observability/ai/overview?hours=${hours || 24}`),
  getAiEvents: async (params?: {
    userId?: string;
    feature?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.userId) searchParams.set('userId', params.userId);
    if (params?.feature) searchParams.set('feature', params.feature);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    const response = await request<{ data: AiUsageEvent[] }>(
      `/api/internal/observability/ai/events?${searchParams.toString()}`,
    );
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/bb84193f-a8cf-4886-a1ac-4ac7dc26e58e', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': '6bb92e',
      },
      body: JSON.stringify({
        sessionId: '6bb92e',
        runId: 'pre-fix',
        hypothesisId: 'H2',
        location: 'apps/web/src/lib/api.ts:observabilityApi.getAiEvents',
        message: 'AI events payload at frontend API client',
        data: {
          count: response.data.length,
          firstEventKeys: response.data[0] ? Object.keys(response.data[0]) : [],
          firstTokensInput: response.data[0]?.tokensInput ?? null,
          firstTokensOutput: response.data[0]?.tokensOutput ?? null,
          firstTokensInputSnake:
            (response.data[0] as Record<string, unknown> | undefined)?.tokens_input ?? null,
          firstTokensOutputSnake:
            (response.data[0] as Record<string, unknown> | undefined)?.tokens_output ?? null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return response;
  },
  getQueueOverview: (hours?: number) =>
    request<{ data: QueueOverview }>(`/api/internal/observability/queues/overview?hours=${hours || 24}`),
  getPlatformOverview: (hours?: number) =>
    request<{ data: PlatformOverview }>(
      `/api/internal/observability/platform/overview?hours=${hours || 24}`,
    ),
  getQueueJobEvents: (params?: {
    userId?: string;
    jobType?: string;
    status?: string;
    outcome?: string;
    jobId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.userId) searchParams.set('userId', params.userId);
    if (params?.jobType) searchParams.set('jobType', params.jobType);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.outcome) searchParams.set('outcome', params.outcome);
    if (params?.jobId) searchParams.set('jobId', params.jobId);
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    return request<{ data: QueueJobEvent[] }>(`/api/internal/observability/queues/jobs?${searchParams.toString()}`);
  },
};

// Types
export interface AppUser {
  id: string;
  authId: string;
  email?: string;
  isOnboarded: boolean;
  isAdmin: boolean;
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

export type MemoryCategory =
  | 'goal'
  | 'project'
  | 'milestone'
  | 'blocker'
  | 'win'
  | 'learning'
  | 'skill_growth'
  | 'preference'
  | 'habit'
  | 'relationship'
  | 'value'
  | 'other';

export type MemoryStatus = 'active' | 'stale' | 'archived';

export interface UserMemory {
  id: string;
  userId: string;
  category: MemoryCategory;
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

export interface PersonalizedPromptSuggestion {
  prompt: string;
  rationale: string;
  anchor:
    | {
        category: MemoryCategory;
        memoryTitle: string;
      }
    | null;
}

export interface PersonalizedPromptsResult {
  prompts: PersonalizedPromptSuggestion[];
  retrieval: {
    structuredCount: number;
    semanticCount: number;
    consideredCount: number;
  };
}

// Observability Types
export interface AiOverview {
  period: {
    hours: number;
    since: string;
  };
  totals: {
    totalCalls: number;
    uniqueUsers: number;
    avgLatencyMs: number;
  };
  statusBreakdown: {
    status: 'success' | 'error' | 'fallback';
    count: number;
  }[];
  featureBreakdown: {
    feature: 'entry_title' | 'memory_extraction' | 'personalized_prompts';
    count: number;
  }[];
}

export interface AiUsageEvent {
  id: string;
  userId: string;
  feature: 'entry_title' | 'memory_extraction' | 'personalized_prompts';
  model: string;
  status: 'success' | 'error' | 'fallback';
  latencyMs: number;
  tokensInput?: number;
  tokensOutput?: number;
  requestContext?: {
    entryId?: string;
    focusCategory?: string;
    memoryCount?: number;
  };
  errorMessage?: string;
  createdAt: string;
}

export interface QueueOverview {
  period: {
    hours: number;
    since: string;
  };
  totals: {
    totalJobs: number;
    uniqueUsers: number;
    avgRetries: number;
  };
  statusBreakdown: {
    status: 'published' | 'processing' | 'retrying' | 'completed' | 'failed' | 'dead_lettered' | 'skipped';
    count: number;
  }[];
  outcomeBreakdown: {
    outcome: string;
    count: number;
  }[];
  rabbitMq: {
    enabled: boolean;
  };
}

export interface PlatformOverview {
  period: {
    hours: number;
    since: string;
  };
  users: {
    totalUsers: number;
    onboardedUsers: number;
    onboardedRate: number;
  };
  entries: {
    totalEntries: number;
    entriesInPeriod: number;
  };
  memories: {
    totalMemories: number;
    statusBreakdown: {
      status: 'active' | 'stale' | 'archived';
      count: number;
    }[];
    eventBreakdown: {
      eventType: 'created' | 'updated' | 'merged' | 'archived';
      count: number;
    }[];
  };
  tags: {
    totalTags: number;
    systemGeneratedTags: number;
    userGeneratedTags: number;
  };
}

export interface QueueJobEvent {
  id: string;
  jobId: string;
  jobType: 'memory_entry_changed';
  userId: string;
  entryId?: string;
  status: 'published' | 'processing' | 'retrying' | 'completed' | 'failed' | 'dead_lettered' | 'skipped';
  retryCount: number;
  outcome?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
