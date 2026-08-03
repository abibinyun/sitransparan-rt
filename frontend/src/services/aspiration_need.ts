import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import {
  Aspiration,
  CreateAspirationPayload,
  UpdateAspirationStatusPayload,
  CommunityNeed,
  CreateCommunityNeedPayload,
  UpdateCommunityNeedPayload,
} from '../types/aspiration_need';

export function usePublicAspirations(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['public-aspirations', params],
    queryFn: async () => {
      const res = await api.get<{ data: Aspiration[]; total: number }>('/public/aspirations', { params });
      return res.data;
    },
  });
}

export function usePublicCommunityNeeds(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['public-community-needs', params],
    queryFn: async () => {
      const res = await api.get<{ data: CommunityNeed[]; total: number }>('/public/community-needs', { params });
      return res.data;
    },
  });
}

export function useAspirations(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['aspirations', params],
    queryFn: async () => {
      const res = await api.get<{ data: Aspiration[]; total: number }>('/aspirations', { params });
      return res.data;
    },
  });
}

export function useCommunityNeeds(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['community-needs', params],
    queryFn: async () => {
      const res = await api.get<{ data: CommunityNeed[]; total: number }>('/community-needs', { params });
      return res.data;
    },
  });
}

export function useSubmitAspiration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateAspirationPayload) => {
      const res = await api.post<Aspiration>('/aspirations', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aspirations'] });
      queryClient.invalidateQueries({ queryKey: ['public-aspirations'] });
    },
  });
}

export function useUpdateAspirationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateAspirationStatusPayload }) => {
      const res = await api.patch<Aspiration>(`/aspirations/${id}/status`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aspirations'] });
      queryClient.invalidateQueries({ queryKey: ['public-aspirations'] });
    },
  });
}

export function useCreateCommunityNeed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateCommunityNeedPayload) => {
      const res = await api.post<CommunityNeed>('/community-needs', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-needs'] });
      queryClient.invalidateQueries({ queryKey: ['public-community-needs'] });
    },
  });
}

export function useUpdateCommunityNeed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateCommunityNeedPayload }) => {
      const res = await api.put<CommunityNeed>(`/community-needs/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-needs'] });
      queryClient.invalidateQueries({ queryKey: ['public-community-needs'] });
    },
  });
}
