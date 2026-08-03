import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import {
  Announcement,
  CreateAnnouncementPayload,
  UpdateAnnouncementPayload,
  Document,
  CreateDocumentPayload,
  UpdateDocumentPayload,
} from '../types/announcement_doc';

// Public Announcements & Documents
export function usePublicAnnouncements(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['public-announcements', params],
    queryFn: async () => {
      const res = await api.get<{ data: Announcement[]; total: number }>('/public/announcements', { params });
      return res.data;
    },
  });
}

export function usePublicDocuments(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['public-documents', params],
    queryFn: async () => {
      const res = await api.get<{ data: Document[]; total: number }>('/public/documents', { params });
      return res.data;
    },
  });
}

// Protected Announcements
export function useAnnouncements(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['announcements', params],
    queryFn: async () => {
      const res = await api.get<{ data: Announcement[]; total: number }>('/announcements', { params });
      return res.data;
    },
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateAnnouncementPayload) => {
      const res = await api.post<Announcement>('/announcements', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      queryClient.invalidateQueries({ queryKey: ['public-announcements'] });
    },
  });
}

export function useUpdateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateAnnouncementPayload }) => {
      const res = await api.put<Announcement>(`/announcements/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      queryClient.invalidateQueries({ queryKey: ['public-announcements'] });
    },
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/announcements/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      queryClient.invalidateQueries({ queryKey: ['public-announcements'] });
    },
  });
}

// Protected Documents
export function useDocuments(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['documents', params],
    queryFn: async () => {
      const res = await api.get<{ data: Document[]; total: number }>('/documents', { params });
      return res.data;
    },
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateDocumentPayload) => {
      const res = await api.post<Document>('/documents', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['public-documents'] });
    },
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateDocumentPayload }) => {
      const res = await api.put<Document>(`/documents/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['public-documents'] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['public-documents'] });
    },
  });
}
