import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { Tenant } from '../types/auth';

export interface CreateTenantPayload {
  name: string;
  code: string;
}

export const useTenantsQuery = () => {
  return useQuery<Tenant[], Error>({
    queryKey: ['tenants'],
    queryFn: async () => {
      const res = await api.get<Tenant[]>('/superadmin/tenants');
      return res.data;
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

export const useDeleteTenantMutation = () => {
  return useMutation<void, Error, string>({
    mutationFn: async (tenantId) => {
      await api.delete(`/superadmin/tenants/${tenantId}`);
    },
  });
};
