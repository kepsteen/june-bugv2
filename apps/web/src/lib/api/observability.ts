import { request } from './client';

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
    return request<{ data: AiUsageEvent[] }>(
      `/api/internal/observability/ai/events?${searchParams.toString()}`,
    );
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
