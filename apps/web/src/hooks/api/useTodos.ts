import { useQuery, useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { todosApi, type Todo } from '@/lib/api';

/**
 * Query hook to get all todos
 */
export function useGetAllTodosQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['todos'],
    queryFn: () => todosApi.list(),
    enabled: options?.enabled !== false,
    staleTime: 30_000,
  });
}

type CreateTodoResponse = { data: Todo };
type CreateTodoVariables = { text: string };
type ToggleTodoResponse = { data: Todo };

/**
 * Mutation hook to create a todo
 * Automatically invalidates todos list on success
 */
export function useCreateTodoMutation(
  options?: Omit<UseMutationOptions<CreateTodoResponse, Error, CreateTodoVariables, unknown>, 'mutationFn'>
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restOptions } = options || {};

  return useMutation({
    ...restOptions,
    mutationFn: (variables: CreateTodoVariables) => todosApi.create({ payload: variables }),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      if (onSuccess) {
        onSuccess(...args);
      }
    },
  });
}

/**
 * Mutation hook to toggle todo completion status
 * Automatically invalidates todos list on success
 */
export function useToggleTodoMutation(
  options?: Omit<UseMutationOptions<ToggleTodoResponse, Error, string, unknown>, 'mutationFn'>
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restOptions } = options || {};

  return useMutation({
    ...restOptions,
    mutationFn: (id: string) => todosApi.toggle(id),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      if (onSuccess) {
        onSuccess(...args);
      }
    },
  });
}

/**
 * Mutation hook to delete a todo
 * Automatically invalidates todos list on success
 */
export function useDeleteTodoMutation(
  options?: Omit<UseMutationOptions<void, Error, string, unknown>, 'mutationFn'>
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restOptions } = options || {};

  return useMutation({
    ...restOptions,
    mutationFn: (id: string) => todosApi.delete(id),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      if (onSuccess) {
        onSuccess(...args);
      }
    },
  });
}
