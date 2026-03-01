import { useQuery, useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { entriesApi, type Entry } from '@/lib/api';

/**
 * Query hook to get all entries
 */
export function useGetAllEntriesQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['entries'],
    queryFn: () => entriesApi.list(),
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
type CreateEntryVariables = { entryDate?: string };
type UpdateEntryVariables = { id: string; payload: Partial<Entry> };
type UpdateEntryResponse = { data: Entry };
type CreateTitleVariables = { id: string; payload: { content: string } };

/**
 * Mutation hook to create a new entry
 * Automatically invalidates the entries list on success
 */
export function useCreateEntryMutation(
  options?: Omit<UseMutationOptions<CreateEntryResponse, Error, CreateEntryVariables, unknown>, 'mutationFn'>
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restOptions } = options || {};

  return useMutation({
    ...restOptions,
    mutationFn: (variables: CreateEntryVariables) => entriesApi.create({ payload: variables }),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      if (onSuccess) {
        onSuccess(...args);
      }
    },
  });
}

/**
 * Mutation hook to create an entry title
 * Automatically invalidates the entries list on success
 */
export function useCreateEntryTitleMutation(
  options?: Omit<UseMutationOptions<CreateEntryResponse, Error, CreateTitleVariables, unknown>, 'mutationFn'>
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restOptions } = options || {};

  return useMutation({
    ...restOptions,
    mutationFn: (variables: CreateTitleVariables) => entriesApi.createTitle(variables),
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
    mutationFn: (variables: UpdateEntryVariables) => entriesApi.update(variables),
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
 * Mutation hook to delete an entry
 * Automatically invalidates the entries list on success
 */
export function useDeleteEntryMutation(
  options?: Omit<UseMutationOptions<void, Error, string, unknown>, 'mutationFn'>
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restOptions } = options || {};

  return useMutation({
    ...restOptions,
    mutationFn: (id: string) => entriesApi.delete(id),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      if (onSuccess) {
        onSuccess(...args);
      }
    },
  });
}
