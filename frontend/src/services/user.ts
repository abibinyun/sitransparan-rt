import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export type RoleName = 'superadmin' | 'admin_rt' | 'resident';

export interface UserWithRole {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role_name: RoleName;
  tenant_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ListUsersResponse {
  data: UserWithRole[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: RoleName;
}

export interface UpdateUserPayload {
  name: string;
  email: string;
  phone?: string;
  role: RoleName;
  password?: string;
}

export function useUsers(limit = 10, offset = 0) {
  return useQuery<ListUsersResponse>({
    queryKey: ['users', limit, offset],
    queryFn: async () => {
      const res = await api.get('/users', { params: { limit, offset } });
      return res.data;
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateUserPayload) => {
      const res = await api.post('/users', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateUserPayload }) => {
      const res = await api.put(`/users/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/users/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
