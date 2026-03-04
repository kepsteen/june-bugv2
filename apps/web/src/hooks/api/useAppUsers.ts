import { useQuery, useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { appUsersApi, type AppUser } from '@/lib/api';

/**
 * Query hook to get the current app user
 */
export function useGetCurrentAppUserQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['appUser'],
    queryFn: () => appUsersApi.getMe(),
    enabled: options?.enabled !== false,
    staleTime: 60_000,
  });
}

/**
 * Query hook to get onboarding status
 */
export function useGetOnboardingStatusQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['appUser', 'onboarding', 'status'],
    queryFn: () => appUsersApi.getOnboardingStatus(),
    enabled: options?.enabled !== false,
    staleTime: 60_000,
  });
}

type CompleteOnboardingResponse = { data: AppUser };
type CompleteOnboardingVariables = { payload: Partial<AppUser> };

/**
 * Mutation hook to complete onboarding
 * Automatically invalidates app user queries on success
 */
export function useCompleteOnboardingMutation(
  options?: Omit<UseMutationOptions<CompleteOnboardingResponse, Error, CompleteOnboardingVariables, unknown>, 'mutationFn'>
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restOptions } = options || {};

  return useMutation({
    ...restOptions,
    mutationFn: (variables: CompleteOnboardingVariables) => appUsersApi.completeOnboarding(variables),
    onSuccess: async (...args) => {
      fetch('http://127.0.0.1:7243/ingest/c77b8c5e-48b1-490d-a366-6f9361fe3c74',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useAppUsers.ts:44',message:'Mutation onSuccess - starting query refetch',data:{},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
      // Use refetchQueries instead of invalidateQueries to ensure data is fresh before navigation
      await queryClient.refetchQueries({ queryKey: ['appUser'] });
      await queryClient.refetchQueries({ queryKey: ['appUser', 'onboarding'] });
      if (onSuccess) {
        onSuccess(...args);
      }
    },
  });
}
