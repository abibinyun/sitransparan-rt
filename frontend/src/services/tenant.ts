import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { Tenant } from '../types/auth';

export interface CreateTenantPayload {
  name: string;
  slug: string;
  domain?: string;
  logo_url?: string;
}

export interface UpdateTenantPayload {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  logo_url?: string;
}

export interface ListTenantsResponse {
  tenants: Tenant[];
  total: number;
}

export const useTenantsQuery = () => {
  return useQuery<Tenant[], Error>({
    queryKey: ['tenants'],
    queryFn: async () => {
      const res = await api.get<ListTenantsResponse | Tenant[]>('/superadmin/tenants');
      if (Array.isArray(res.data)) {
        return res.data;
      }
      return res.data.tenants || [];
    },
  });
};

export const useCreateTenantMutation = () => {
  return useMutation<Tenant, Error, CreateTenantPayload>({
    mutationFn: async (payload) => {
      const res = await api.post<Tenant>('/superadmin/tenants', payload);
      return res.data;
    },
  });
};

export const useUpdateTenantMutation = () => {
  return useMutation<Tenant, Error, UpdateTenantPayload>({
    mutationFn: async ({ id, ...payload }) => {
      const res = await api.put<Tenant>(`/superadmin/tenants/${id}`, payload);
      return res.data;
    },
  });
};

export const useDeleteTenantMutation = () => {
  return useMutation<void, Error, string>({
    mutationFn: async (tenantId) => {
      await api.delete(`/superadmin/tenants/${tenantId}`);
    },
  });
};
