import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { KarangTarunaPeriod, KarangTarunaMember } from '../types/karang_taruna';

export function useKTPeriods(status?: string) {
  return useQuery<{ data: KarangTarunaPeriod[] }>({
    queryKey: ['kt-periods', status],
    queryFn: async () => {
      const res = await api.get<{ data: KarangTarunaPeriod[] }>('/karang-taruna/periods', {
        params: status ? { status } : undefined,
      });
      return res.data;
    },
  });
}

export function useKTActivePeriod() {
  return useQuery<KarangTarunaPeriod | null>({
    queryKey: ['kt-active-period'],
    queryFn: async () => {
      try {
        const res = await api.get<KarangTarunaPeriod>('/karang-taruna/periods/active');
        return res.data;
      } catch {
        return null;
      }
    },
  });
}

export function useKTMembers(periodId?: string, filters?: { section?: string; role?: string; status?: string }) {
  return useQuery<{ data: KarangTarunaMember[] }>({
    queryKey: ['kt-members', periodId, filters],
    queryFn: async () => {
      const res = await api.get<{ data: KarangTarunaMember[] }>('/karang-taruna/members', {
        params: { period_id: periodId, ...filters },
      });
      return res.data;
    },
    enabled: !!periodId,
  });
}

export function useCreateKTPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; start_date: string; end_date: string; status: string; sk_number?: string }) => {
      const res = await api.post<KarangTarunaPeriod>('/karang-taruna/periods', payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kt-periods'] });
      qc.invalidateQueries({ queryKey: ['kt-active-period'] });
    },
  });
}

export function useUpdateKTPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<KarangTarunaPeriod> }) => {
      const res = await api.put<KarangTarunaPeriod>(`/karang-taruna/periods/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kt-periods'] });
      qc.invalidateQueries({ queryKey: ['kt-active-period'] });
    },
  });
}

export function useUpdateKTConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ periodId, allowed_roles, allowed_sections }: { periodId: string; allowed_roles: string[]; allowed_sections: string[] }) => {
      const res = await api.put(`/karang-taruna/periods/${periodId}/config`, { allowed_roles, allowed_sections });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kt-periods'] });
      qc.invalidateQueries({ queryKey: ['kt-active-period'] });
    },
  });
}

export function useAddKTMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { period_id: string; resident_id: string; role: string; section?: string; custom_title?: string; phone_override?: string; status: string }) => {
      const res = await api.post<KarangTarunaMember>('/karang-taruna/members', payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kt-members'] });
    },
  });
}

export function useUpdateKTMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: { period_id: string; role: string; section?: string; custom_title?: string; phone_override?: string; status: string } }) => {
      const res = await api.put<KarangTarunaMember>(`/karang-taruna/members/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kt-members'] });
    },
  });
}

export function useDeleteKTMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const res = await api.delete(`/karang-taruna/members/${id}`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kt-members'] });
    },
  });
}
