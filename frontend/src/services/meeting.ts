import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import {
  Meeting,
  CreateMeetingDTO,
  AddAttendeeDTO,
  AddDecisionDTO,
  MeetingActionItem,
  CreateActionItemDTO,
} from '../types/meeting';

export const useMeetingsQuery = (visibility?: string) => {
  return useQuery({
    queryKey: ['meetings', visibility],
    queryFn: async () => {
      const params = visibility ? { visibility } : {};
      const res = await api.get<{ data: Meeting[] }>('/meetings', { params });
      return res.data.data || [];
    },
  });
};

export const useMeetingQuery = (id: string) => {
  return useQuery({
    queryKey: ['meeting', id],
    queryFn: async () => {
      const res = await api.get<Meeting>(`/meetings/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
};

export const useCreateMeetingMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateMeetingDTO) => {
      const res = await api.post<Meeting>('/meetings', dto);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });
};

export const useUpdateMeetingMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: CreateMeetingDTO }) => {
      const res = await api.put<Meeting>(`/meetings/${id}`, dto);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['meeting', variables.id] });
    },
  });
};

export const useDeleteMeetingMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/meetings/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });
};

export const useAddAttendeeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ meetingId, dto }: { meetingId: string; dto: AddAttendeeDTO }) => {
      const res = await api.post(`/meetings/${meetingId}/attendees`, dto);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meeting', variables.meetingId] });
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });
};

export const useAddDecisionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ meetingId, dto }: { meetingId: string; dto: AddDecisionDTO }) => {
      const res = await api.post(`/meetings/${meetingId}/decisions`, dto);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meeting', variables.meetingId] });
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });
};

export const useActionItemsQuery = (status?: string) => {
  return useQuery({
    queryKey: ['action-items', status],
    queryFn: async () => {
      const params = status ? { status } : {};
      const res = await api.get<{ data: MeetingActionItem[] }>('/action-items', { params });
      return res.data.data || [];
    },
  });
};

export const useCreateActionItemMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateActionItemDTO) => {
      const res = await api.post<MeetingActionItem>('/action-items', dto);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-items'] });
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });
};

export const useUpdateActionItemMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: Partial<CreateActionItemDTO> }) => {
      const res = await api.put<MeetingActionItem>(`/action-items/${id}`, dto);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-items'] });
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });
};

export const useDeleteActionItemMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/action-items/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-items'] });
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });
};
