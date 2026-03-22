import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import {
  memoriesApi,
  type MemoryCategory,
  type MemoryStatus,
  type UserMemory,
} from '@/lib/api';

type GetMemoriesFilters = {
  category?: MemoryCategory;
  status?: MemoryStatus;
};

type GetMemoriesResponse = { data: UserMemory[] };

export function useGetMemoriesQuery(
  filters?: GetMemoriesFilters,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['memories', filters?.category ?? 'all', filters?.status ?? 'all'],
    queryFn: () => memoriesApi.list(filters),
    enabled: options?.enabled !== false,
    staleTime: 60_000,
  });
}

export function useDeleteMemoryMutation(
  options?: Omit<UseMutationOptions<void, Error, string, unknown>, 'mutationFn'>,
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restOptions } = options || {};

  return useMutation({
    ...restOptions,
    mutationFn: (id: string) => memoriesApi.delete(id),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ['memories'] });
      if (onSuccess) {
        onSuccess(...args);
      }
    },
  });
}

export type { GetMemoriesFilters, GetMemoriesResponse };
