import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { getTenantSlugOrFallback } from '../utils/tenant';

export interface RTPeriod {
  id: string;
  tenant_id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'active' | 'archived';
  sk_number?: string;
  sk_file_url?: string;
  created_at: string;
  updated_at: string;
}

export interface RTMember {
  id: string;
  period_id: string;
  resident_id: string;
  role: 'ketua' | 'wakil' | 'sekretaris' | 'bendahara' | 'seksi' | 'penasihat' | string;
  section?: string;
  custom_title?: string;
  phone_override?: string;
  photo_url?: string;
  status: 'aktif' | 'demisioner' | 'nonaktif';
  joined_at: string;
  created_at: string;
  updated_at: string;
  resident_name?: string;
  resident_nik?: string;
  phone?: string;
}

// Queries
export function useRTPeriods(status?: string) {
  return useQuery<{ data: RTPeriod[] }>({
    queryKey: ['rt-structure', 'periods', status],
    queryFn: async () => {
      const res = await api.get<{ data: RTPeriod[] }>('/rt-structure/periods', {
        params: status ? { status } : undefined,
      });
      return res.data;
    },
  });
}

export function useRTMembers(periodId: string, filters?: { section?: string; role?: string; status?: string }) {
  return useQuery<{ data: RTMember[] }>({
    queryKey: ['rt-structure', 'members', periodId, filters],
    queryFn: async () => {
      if (!periodId) return { data: [] };
      const res = await api.get<{ data: RTMember[] }>('/rt-structure/members', {
        params: { period_id: periodId, ...filters },
      });
      return res.data;
    },
    enabled: Boolean(periodId),
  });
}

export function usePublicRTStructureQuery() {
  const slug = getTenantSlugOrFallback();
  return useQuery<{ period: RTPeriod; members: RTMember[] }>({
    queryKey: ['public-rt-structure', slug],
    queryFn: async () => {
      const res = await api.get<{ period: RTPeriod; members: RTMember[] }>(`/t/${slug}/rt-structure`);
      return res.data;
    },
    enabled: Boolean(slug),
  });
}

// Mutations
export function useCreateRTPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      start_date: string;
      end_date: string;
      status: string;
      sk_number?: string;
      sk_file_url?: string;
    }) => {
      const res = await api.post<RTPeriod>('/rt-structure/periods', payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rt-structure'] });
    },
  });
}

export function useUpdateRTPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: string;
      name: string;
      start_date: string;
      end_date: string;
      status: string;
      sk_number?: string;
      sk_file_url?: string;
    }) => {
      const res = await api.put<RTPeriod>(`/rt-structure/periods/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rt-structure'] });
    },
  });
}

export function useAddRTMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      period_id: string;
      resident_id: string;
      role: string;
      section?: string;
      custom_title?: string;
      phone_override?: string;
      photo_url?: string;
      status: string;
    }) => {
      const res = await api.post<RTMember>('/rt-structure/members', payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rt-structure'] });
    },
  });
}

export function useUpdateRTMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: string;
      role: string;
      section?: string;
      custom_title?: string;
      phone_override?: string;
      photo_url?: string;
      status: string;
    }) => {
      const res = await api.put<RTMember>(`/rt-structure/members/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rt-structure'] });
    },
  });
}

export function useDeleteRTMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/rt-structure/members/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rt-structure'] });
    },
  });
}
