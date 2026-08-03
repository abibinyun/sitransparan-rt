import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { getOfflineCache, setOfflineCache } from './offlineStorage';
import {
  Resident,
  ResidentFilter,
  ResidentListResponse,
  CreateResidentPayload,
  UpdateResidentPayload,
  FamilyMember,
  CreateFamilyMemberPayload,
} from '../types/resident';

export function useResidents(params?: ResidentFilter) {
  return useQuery({
    queryKey: ['residents', params],
    queryFn: async () => {
      const cacheKey = `residents_${JSON.stringify(params || {})}`;
      try {
        const res = await api.get<ResidentListResponse | Resident[]>('/residents', { params });
        let resultData: ResidentListResponse;
        if (Array.isArray(res.data)) {
          resultData = {
            data: res.data,
            total: res.data.length,
            page: params?.page || 1,
            limit: params?.limit || 10,
          } as ResidentListResponse;
        } else {
          resultData = res.data;
        }
        await setOfflineCache(cacheKey, resultData);
        return resultData;
      } catch (err) {
        if (!navigator.onLine) {
          const cached = await getOfflineCache<ResidentListResponse>(cacheKey);
          if (cached) return cached;
        }
        throw err;
      }
    },
  });
}

export function useResident(id: string | null) {
  return useQuery({
    queryKey: ['residents', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await api.get<Resident>(`/residents/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateResident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateResidentPayload) => {
      const res = await api.post<Resident>('/residents', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
    },
  });
}

export function useUpdateResident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateResidentPayload }) => {
      const res = await api.put<Resident>(`/residents/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
    },
  });
}

export function useDeleteResident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/residents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
    },
  });
}

export function useAddFamilyMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ residentId, payload }: { residentId: string; payload: CreateFamilyMemberPayload }) => {
      const res = await api.post<FamilyMember>(`/residents/${residentId}/family-members`, payload);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      queryClient.invalidateQueries({ queryKey: ['residents', variables.residentId] });
    },
  });
}
