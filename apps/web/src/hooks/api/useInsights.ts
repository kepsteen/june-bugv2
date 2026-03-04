import { useQuery, useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { insightsApi } from '@/lib/api';

type InsightsPrompts = {
  prompts: { category: string; prompt: string }[];
  summary: string;
  topics: string[];
  lastAnalyzedAt: string;
};

type GetPromptsResponse = { data: InsightsPrompts | null };
type RefreshResponse = { data: InsightsPrompts };

/**
 * Query hook to get personalized prompts for the user
 */
export function useGetPersonalizedPromptsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['insights', 'prompts'],
    queryFn: () => insightsApi.getPrompts(),
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes - insights refresh daily but we want fresh data when sidebar opens
  });
}

/**
 * Mutation hook to manually refresh insights
 * Automatically invalidates the prompts query on success
 */
export function useRefreshInsightsMutation(
  options?: Omit<UseMutationOptions<RefreshResponse, Error, void, unknown>, 'mutationFn'>
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restOptions } = options || {};

  return useMutation({
    ...restOptions,
    mutationFn: () => insightsApi.refresh(),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ['insights', 'prompts'] });
      if (onSuccess) {
        onSuccess(...args);
      }
    },
  });
}
