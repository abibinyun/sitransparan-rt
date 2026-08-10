import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { Tenant, User } from '../types/auth';

export interface LoginPayload {
  email: string;
  password?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export const useLoginMutation = () => {
  return useMutation<LoginResponse, Error, LoginPayload>({
    mutationFn: async (payload) => {
      const res = await api.post<LoginResponse>('/auth/login', payload);
      return res.data;
    },
  });
};

export const useRegisterMutation = () => {
  return useMutation<User, Error, RegisterPayload>({
    mutationFn: async (payload) => {
      const res = await api.post<User>('/auth/register', payload);
      return res.data;
    },
  });
};

export const useProfileQuery = () => {
  return useQuery<User, Error>({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await api.get<User>('/auth/me');
      return res.data;
    },
  });
};

// Fetches the tenants the signed-in user is actually mapped to. The backend
// returns this list from the verified identity, so the frontend never trusts a
// client-supplied tenant list.
export const useUserTenantsQuery = () => {
  return useQuery<Tenant[], Error>({
    queryKey: ['user-tenants'],
    queryFn: async () => {
      const res = await api.get<Tenant[]>('/auth/tenants');
      return Array.isArray(res.data) ? res.data : [];
    },
  });
};

// Switches the active tenant server-side: the backend verifies the mapping and
// returns a fresh JWT scoped to the selected tenant.
export const useSwitchTenantMutation = () => {
  return useMutation<LoginResponse, Error, string>({
    mutationFn: async (tenantId: string) => {
      const res = await api.post<LoginResponse>('/auth/switch-tenant', { tenant_id: tenantId });
      return res.data;
    },
  });
};

// Fetches the user's tenants using an explicit token (used right after login,
// before the token is stored in the auth store).
export async function fetchUserTenantsWithToken(token: string): Promise<Tenant[]> {
  const res = await api.get<Tenant[]>('/auth/tenants', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return Array.isArray(res.data) ? res.data : [];
}
