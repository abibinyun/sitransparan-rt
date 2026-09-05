import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { Resident } from '../types/resident';

export interface House {
  id: string;
  block_number: string;
  address?: string;
  head_resident_id?: string;
  head_resident?: Resident;
  user_id?: string;
  access_token: string;
  token_status: 'active' | 'revoked' | 'suspended';
  pin_code?: string;
  token_version?: number;
  created_at: string;
  updated_at: string;
}

export interface HouseListResponse {
  data: House[];
  total: number;
}

export interface CreateHousePayload {
  block_number: string;
  address?: string;
  head_resident_id?: string;
}

export interface ClaimHouseTokenResponse {
  token: string;
  house: House;
  tenant_slug: string;
  tenant_name: string;
  head_resident?: Resident;
  user?: {
    id: string;
    name: string;
    email: string;
    role?: string;
  };
}

export function useHouses(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['admin-houses', params],
    queryFn: async () => {
      const res = await api.get<HouseListResponse>('/admin/houses', {
        params: { limit: params?.limit || 50, offset: params?.offset || 0 },
      });
      return res.data;
    },
  });
}

export function useCreateHouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateHousePayload) => {
      const res = await api.post<House>('/admin/houses', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-houses'] });
    },
  });
}

export function useUpdateHouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: CreateHousePayload & { id: string }) => {
      const res = await api.put<House>(`/admin/houses/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-houses'] });
    },
  });
}

export function useDeleteHouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (houseId: string) => {
      const res = await api.delete<{ message: string }>(`/admin/houses/${houseId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-houses'] });
    },
  });
}

export function useRegenerateHouseToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (houseId: string) => {
      const res = await api.post<House>(`/admin/houses/${houseId}/regenerate-token`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-houses'] });
    },
  });
}

export function useResetHousePin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (houseId: string) => {
      const res = await api.post<House>(`/admin/houses/${houseId}/reset-pin`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-houses'] });
    },
  });
}

export async function claimHouseToken(slug: string, token: string): Promise<ClaimHouseTokenResponse> {
  const res = await api.get<ClaimHouseTokenResponse>('/house-access/claim', {
    params: { slug, token },
  });
  return res.data;
}
