import { useQuery, useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { entriesApi, type Entry } from '@/lib/api';

/**
 * Query hook to get all entries
 */
export function useGetAllEntriesQuery(options?: { includeInactive?: boolean; enabled?: boolean }) {
  return useQuery({
    queryKey: ['entries', options?.includeInactive],
    queryFn: () => entriesApi.list(options?.includeInactive),
    enabled: options?.enabled !== false,
    staleTime: 30_000,
  });
}

/**
 * Query hook to get a single entry by ID
 */
export function useGetEntryByIdQuery(entryId: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['entry', entryId],
    queryFn: () => (entryId ? entriesApi.get(entryId) : null),
    enabled: !!entryId && (options?.enabled !== false),
    staleTime: 30_000,
  });
}

/**
 * Query hook to search entries
 */
export function useSearchEntriesQuery(query: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['entries', 'search', query],
    queryFn: () => entriesApi.search(query),
    enabled: !!query && query.trim().length > 0 && (options?.enabled !== false),
    staleTime: 30_000,
  });
}

/**
 * Query hook to get entries by date range
 */
export function useGetEntriesByRangeQuery(start: string, end: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['entries', 'range', start, end],
    queryFn: () => entriesApi.getByRange(start, end),
    enabled: !!start && !!end && (options?.enabled !== false),
    staleTime: 30_000,
  });
}

type CreateEntryResponse = { data: Entry };
type UpdateEntryVariables = { id: string; data: Partial<Entry> };
type UpdateEntryResponse = { data: Entry };

/**
 * Mutation hook to create a new entry
 * Automatically invalidates the entries list on success
 */
export function useCreateEntryMutation(
  options?: Omit<UseMutationOptions<CreateEntryResponse, Error, string | undefined, unknown>, 'mutationFn'>
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restOptions } = options || {};

  return useMutation({
    ...restOptions,
    mutationFn: (entryDate?: string) => entriesApi.create(entryDate),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      if (onSuccess) {
        onSuccess(...args);
      }
    },
  });
}

/**
 * Mutation hook to update an entry
 * Automatically invalidates queries and updates cache on success
 */
export function useUpdateEntryMutation(
  options?: Omit<UseMutationOptions<UpdateEntryResponse, Error, UpdateEntryVariables, unknown>, 'mutationFn'>
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restOptions } = options || {};

  return useMutation({
    ...restOptions,
    mutationFn: ({ id, data }: UpdateEntryVariables) =>
      entriesApi.update(id, data),
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.setQueryData(['entry', variables.id], data);
      if (onSuccess) {
        onSuccess(data, variables, ...rest);
      }
    },
  });
}

/**
 * Mutation hook to soft delete an entry
 * Automatically invalidates the entries list on success
 */
export function useSoftDeleteEntryMutation(
  options?: Omit<UseMutationOptions<void, Error, string, unknown>, 'mutationFn'>
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restOptions } = options || {};

  return useMutation({
    ...restOptions,
    mutationFn: (id: string) => entriesApi.softDelete(id),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      if (onSuccess) {
        onSuccess(...args);
      }
    },
  });
}

/**
 * Mutation hook to permanently delete an entry
 * Automatically invalidates the entries list on success
 */
export function usePermanentDeleteEntryMutation(
  options?: Omit<UseMutationOptions<void, Error, string, unknown>, 'mutationFn'>
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restOptions } = options || {};

  return useMutation({
    ...restOptions,
    mutationFn: (id: string) => entriesApi.permanentDelete(id),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      if (onSuccess) {
        onSuccess(...args);
      }
    },
  });
}
