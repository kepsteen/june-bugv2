import { useQuery, useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { tagsApi, type Tag } from '@/lib/api';

/**
 * Query hook to get all tags
 */
export function useGetAllTagsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => tagsApi.list(),
    enabled: options?.enabled !== false,
    staleTime: 60_000,
  });
}

/**
 * Query hook to get tags for a specific entry
 */
export function useGetEntryTagsQuery(entryId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['entries', entryId, 'tags'],
    queryFn: () => tagsApi.getEntryTags(entryId),
    enabled: !!entryId && (options?.enabled !== false),
    staleTime: 60_000,
  });
}

type CreateTagVariables = { name: string; emoji?: string; color?: string };
type CreateTagResponse = { data: Tag };
type UpdateTagVariables = { id: string; payload: Partial<Tag> };
type UpdateTagResponse = { data: Tag };
type TagEntryVariables = { entryId: string; payload: { tagId: string } };
type RemoveTagVariables = { entryId: string; tagId: string };
type SetEntryTagsVariables = { entryId: string; payload: { tagIds: string[] } };

/**
 * Mutation hook to create a tag
 * Automatically invalidates tags list on success
 */
export function useCreateTagMutation(
  options?: Omit<UseMutationOptions<CreateTagResponse, Error, CreateTagVariables, unknown>, 'mutationFn'>
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restOptions } = options || {};

  return useMutation({
    ...restOptions,
    mutationFn: (variables: CreateTagVariables) => tagsApi.create({ payload: variables }),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      if (onSuccess) {
        onSuccess(...args);
      }
    },
  });
}

/**
 * Mutation hook to update a tag
 * Automatically invalidates tags list on success
 */
export function useUpdateTagMutation(
  options?: Omit<UseMutationOptions<UpdateTagResponse, Error, UpdateTagVariables, unknown>, 'mutationFn'>
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restOptions } = options || {};

  return useMutation({
    ...restOptions,
    mutationFn: (variables: UpdateTagVariables) => tagsApi.update(variables),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      if (onSuccess) {
        onSuccess(...args);
      }
    },
  });
}

/**
 * Mutation hook to delete a tag
 * Automatically invalidates tags list on success
 */
export function useDeleteTagMutation(
  options?: Omit<UseMutationOptions<void, Error, string, unknown>, 'mutationFn'>
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restOptions } = options || {};

  return useMutation({
    ...restOptions,
    mutationFn: (id: string) => tagsApi.delete(id),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      if (onSuccess) {
        onSuccess(...args);
      }
    },
  });
}

/**
 * Mutation hook to add a tag to an entry
 * Automatically invalidates entry tags and tags list on success
 */
export function useAddTagToEntryMutation(
  options?: Omit<UseMutationOptions<void, Error, TagEntryVariables, unknown>, 'mutationFn'>
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restOptions } = options || {};

  return useMutation({
    ...restOptions,
    mutationFn: (variables: TagEntryVariables) => tagsApi.addTag(variables),
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: ['entries', variables.entryId, 'tags'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      if (onSuccess) {
        onSuccess(data, variables, ...rest);
      }
    },
  });
}

/**
 * Mutation hook to remove a tag from an entry
 * Automatically invalidates entry tags and tags list on success
 */
export function useRemoveTagFromEntryMutation(
  options?: Omit<UseMutationOptions<void, Error, RemoveTagVariables, unknown>, 'mutationFn'>
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restOptions } = options || {};

  return useMutation({
    ...restOptions,
    mutationFn: (variables: RemoveTagVariables) => tagsApi.removeTag(variables),
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: ['entries', variables.entryId, 'tags'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      if (onSuccess) {
        onSuccess(data, variables, ...rest);
      }
    },
  });
}

/**
 * Mutation hook to set all tags for an entry
 * Automatically invalidates entry tags and tags list on success
 */
export function useSetEntryTagsMutation(
  options?: Omit<UseMutationOptions<void, Error, SetEntryTagsVariables, unknown>, 'mutationFn'>
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restOptions } = options || {};

  return useMutation({
    ...restOptions,
    mutationFn: (variables: SetEntryTagsVariables) => tagsApi.setTags(variables),
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: ['entries', variables.entryId, 'tags'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      if (onSuccess) {
        onSuccess(data, variables, ...rest);
      }
    },
  });
}
