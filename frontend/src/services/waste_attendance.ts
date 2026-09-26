import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export interface WasteCollector {
  id: string;
  tenant_id: string;
  resident_id?: string;
  name: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WasteAttendanceMember {
  id: string;
  attendance_id: string;
  collector_id: string;
  collector_name?: string;
  wage_amount: number;
  created_at: string;
}

export interface WasteAttendance {
  id: string;
  tenant_id: string;
  date: string;
  wage_per_person: number;
  total_wage: number;
  notes?: string;
  created_by?: string;
  members: WasteAttendanceMember[];
  created_at: string;
  updated_at: string;
}

export interface CreateCollectorPayload {
  resident_id?: string;
  name: string;
  phone?: string;
}

export interface UpdateCollectorPayload {
  resident_id?: string;
  name: string;
  phone?: string;
  is_active: boolean;
}

export interface CreateAttendancePayload {
  date: string;
  collector_ids: string[];
  wage_per_person?: number;
  notes?: string;
}

// ---------- Collectors Hooks ----------

export function useWasteCollectors(onlyActive = false) {
  return useQuery<{ data: WasteCollector[] }>({
    queryKey: ['waste-collectors', onlyActive],
    queryFn: async () => {
      const res = await api.get<{ data: WasteCollector[] }>('/waste-collectors', {
        params: { active: onlyActive ? 'true' : undefined },
      });
      return res.data;
    },
  });
}

export function useCreateWasteCollector() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateCollectorPayload) => {
      const res = await api.post<WasteCollector>('/waste-collectors', payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['waste-collectors'] });
    },
  });
}

export function useUpdateWasteCollector() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateCollectorPayload }) => {
      const res = await api.put<WasteCollector>(`/waste-collectors/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['waste-collectors'] });
    },
  });
}

export function useDeleteWasteCollector() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/waste-collectors/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['waste-collectors'] });
    },
  });
}

// ---------- Attendance Hooks ----------

export function useWasteAttendance(limit = 20, offset = 0) {
  return useQuery<{ data: WasteAttendance[]; total: number }>({
    queryKey: ['waste-attendance', limit, offset],
    queryFn: async () => {
      const res = await api.get<{ data: WasteAttendance[]; total: number }>('/waste-attendance', {
        params: { limit, offset },
      });
      return res.data;
    },
  });
}

export function useCreateWasteAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateAttendancePayload) => {
      const res = await api.post<WasteAttendance>('/waste-attendance', payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['waste-attendance'] });
    },
  });
}

export function useDeleteWasteAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/waste-attendance/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['waste-attendance'] });
    },
  });
}
