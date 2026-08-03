import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import {
  EventItem,
  CreateEventPayload,
  UpdateEventPayload,
  EventBudget,
  EventParticipant,
  EventFilter,
} from '../types/event';

export function useEvents(params?: EventFilter) {
  return useQuery({
    queryKey: ['events', params],
    queryFn: async () => {
      const res = await api.get<{ data: EventItem[]; total: number }>('/events', { params });
      return res.data;
    },
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: ['events', id],
    queryFn: async () => {
      const res = await api.get<EventItem>(`/events/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateEventPayload) => {
      const res = await api.post<EventItem>('/events', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateEventPayload }) => {
      const res = await api.put<EventItem>(`/events/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/events/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useSaveEventBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, payload }: { eventId: string; payload: Partial<EventBudget> }) => {
      const res = await api.post<EventBudget>(`/events/${eventId}/budget`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useSaveEventRSVP() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, payload }: { eventId: string; payload: Partial<EventParticipant> }) => {
      const res = await api.post<EventParticipant>(`/events/${eventId}/rsvp`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
