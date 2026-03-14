import { useMutation, useQuery, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { promptsApi, type MemoryCategory, type PersonalizedPromptsResult } from '@/lib/api';

export function useGetPersonalizedPromptsQuery(
  input: { entryId: string; focusCategory?: MemoryCategory; entryDraft?: string },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['prompts', 'personalized', input.entryId, input.focusCategory ?? 'all'],
    queryFn: () => promptsApi.getPersonalized({ payload: input }),
    enabled: !!input.entryId && options?.enabled !== false,
    staleTime: 60_000,
  });
}

type RegeneratePromptsVariables = {
  entryId: string;
  focusCategory?: MemoryCategory;
  entryDraft?: string;
};

export function useRegeneratePersonalizedPromptsMutation(
  options?: Omit<
    UseMutationOptions<{ data: PersonalizedPromptsResult }, Error, RegeneratePromptsVariables, unknown>,
    'mutationFn'
  >,
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restOptions } = options || {};

  return useMutation({
    ...restOptions,
    mutationFn: (variables: RegeneratePromptsVariables) =>
      promptsApi.regeneratePersonalized({ payload: variables }),
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({
        queryKey: ['prompts', 'personalized', variables.entryId, variables.focusCategory ?? 'all'],
      });
      if (onSuccess) {
        onSuccess(data, variables, ...rest);
      }
    },
  });
}
