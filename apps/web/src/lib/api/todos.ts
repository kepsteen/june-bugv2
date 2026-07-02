import { request } from './client';

export interface Todo {
  id: string;
  userId: string;
  text: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export const todosApi = {
  list: () => request<{ data: Todo[] }>('/api/todos'),
  create: (data: { payload: { text: string } }) =>
    request<{ data: Todo }>('/api/todos', {
      method: 'POST',
      body: JSON.stringify(data.payload),
    }),
  toggle: (id: string) =>
    request<{ data: Todo }>(`/api/todos/${id}/toggle`, { method: 'PUT' }),
  delete: (id: string) =>
    request<void>(`/api/todos/${id}`, { method: 'DELETE' }),
};
