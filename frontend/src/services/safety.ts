import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export interface EmergencyAlert {
  id: string;
  user_id: string;
  house_id?: string;
  reporter_name: string;
  house_number?: string;
  alert_type: string;
  description?: string;
  status: 'active' | 'resolved';
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}

export interface HouseVacancy {
  id: string;
  house_id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  emergency_contact: string;
  notes?: string;
  status: 'active' | 'completed';
  created_at: string;
}

export function useActiveEmergenciesQuery() {
  return useQuery<{ data: EmergencyAlert[] }>({
    queryKey: ['safety', 'emergencies'],
    queryFn: async () => {
      const res = await api.get<{ data: EmergencyAlert[] }>('/safety/emergencies');
      return res.data;
    },
    refetchInterval: 10000, // Poll tiap 10 detik untuk alarm darurat
  });
}

export function useTriggerPanicMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      house_id?: string;
      reporter_name: string;
      house_number: string;
      alert_type: string;
      description: string;
    }) => {
      const res = await api.post<EmergencyAlert>('/safety/panic', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety', 'emergencies'] });
    },
  });
}

export function useResolveEmergencyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (alertId: string) => {
      await api.post(`/safety/emergencies/${alertId}/resolve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety', 'emergencies'] });
    },
  });
}

export function useHouseVacanciesQuery() {
  return useQuery<{ data: HouseVacancy[] }>({
    queryKey: ['safety', 'vacancies'],
    queryFn: async () => {
      const res = await api.get<{ data: HouseVacancy[] }>('/safety/vacancies');
      return res.data;
    },
  });
}

export function useReportHouseVacancyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      house_id: string;
      start_date: string;
      end_date: string;
      emergency_contact: string;
      notes?: string;
    }) => {
      const res = await api.post<HouseVacancy>('/safety/vacancies', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety', 'vacancies'] });
    },
  });
}
