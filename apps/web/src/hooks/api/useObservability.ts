import { useQuery } from '@tanstack/react-query';
import { observabilityApi } from '@/lib/api';

/**
 * Query hook to get AI usage overview
 */
export function useGetAiOverviewQuery(hours: number = 24, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['observability', 'ai', 'overview', hours],
    queryFn: () => observabilityApi.getAiOverview(hours),
    enabled: options?.enabled !== false,
    staleTime: 30_000,
  });
}

/**
 * Query hook to get AI usage events
 */
export function useGetAiEventsQuery(
  params?: {
    userId?: string;
    feature?: string;
    status?: string;
    limit?: number;
    offset?: number;
  },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['observability', 'ai', 'events', params],
    queryFn: () => observabilityApi.getAiEvents(params),
    enabled: options?.enabled !== false,
    staleTime: 30_000,
  });
}

/**
 * Query hook to get queue overview
 */
export function useGetQueueOverviewQuery(hours: number = 24, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['observability', 'queues', 'overview', hours],
    queryFn: () => observabilityApi.getQueueOverview(hours),
    enabled: options?.enabled !== false,
    staleTime: 30_000,
  });
}

/**
 * Query hook to get queue job events
 */
export function useGetQueueJobEventsQuery(
  params?: {
    userId?: string;
    jobType?: string;
    status?: string;
    jobId?: string;
    limit?: number;
    offset?: number;
  },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['observability', 'queues', 'jobs', params],
    queryFn: () => observabilityApi.getQueueJobEvents(params),
    enabled: options?.enabled !== false,
    staleTime: 30_000,
  });
}
