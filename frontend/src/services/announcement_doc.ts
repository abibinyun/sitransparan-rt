import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import {
  Announcement,
  CreateAnnouncementPayload,
  UpdateAnnouncementPayload,
  Document,
  CreateDocumentPayload,
  UpdateDocumentPayload,
  AnnouncementComment,
} from '../types/announcement_doc';

import { getTenantSlugOrFallback } from '../utils/tenant';

import { useInfiniteQuery } from '@tanstack/react-query';

// Public Announcements & Documents with Category & Infinite Scrolling
export function usePublicAnnouncements(params?: { limit?: number; offset?: number; category?: string }) {
  const tenantSlug = getTenantSlugOrFallback();
  return useQuery({
    queryKey: ['public-announcements', tenantSlug, params],
    queryFn: async () => {
      const res = await api.get<{ data: Announcement[]; total: number }>(`/t/${tenantSlug}/announcements`, { params });
      return res.data;
    },
  });
}

export function useInfinitePublicAnnouncements(category?: string, limit = 6) {
  const tenantSlug = getTenantSlugOrFallback();
  return useInfiniteQuery({
    queryKey: ['infinite-public-announcements', tenantSlug, category],
    queryFn: async ({ pageParam = 0 }) => {
      const params: Record<string, any> = { limit, offset: pageParam };
      if (category && category !== 'all') {
        params.category = category;
      }
      const res = await api.get<{ data: Announcement[]; total: number }>(`/t/${tenantSlug}/announcements`, { params });
      return res.data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce((acc, p) => acc + (p.data?.length || 0), 0);
      if (loadedCount < (lastPage.total || 0)) {
        return loadedCount;
      }
      return undefined;
    },
  });
}

export function usePublicAnnouncementDetail(id: string | null) {
  const tenantSlug = getTenantSlugOrFallback();
  return useQuery({
    queryKey: ['public-announcement-detail', tenantSlug, id],
    queryFn: async () => {
      if (!id) return null;
      const res = await api.get<Announcement>(`/t/${tenantSlug}/announcements/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function usePublicDocuments(params?: { limit?: number; offset?: number }) {
  const tenantSlug = getTenantSlugOrFallback();
  return useQuery({
    queryKey: ['public-documents', tenantSlug, params],
    queryFn: async () => {
      const res = await api.get<{ data: Document[]; total: number }>(`/t/${tenantSlug}/documents`, { params });
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
      queryClient.invalidateQueries({ queryKey: ['infinite-public-announcements'] });
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
      queryClient.invalidateQueries({ queryKey: ['infinite-public-announcements'] });
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
      queryClient.invalidateQueries({ queryKey: ['infinite-public-announcements'] });
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
    mutationFn: async (payload: CreateDocumentPayload | FormData) => {
      const isFormData = payload instanceof FormData;
      const res = await api.post<Document>('/documents', payload, {
        headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
      });
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

// Comments
export function useAnnouncementComments(announcementId: string | null) {
  const tenantSlug = getTenantSlugOrFallback();
  return useQuery({
    queryKey: ['announcement-comments', tenantSlug, announcementId],
    queryFn: async () => {
      if (!announcementId) return [];
      const res = await api.get<{ data: AnnouncementComment[] }>(`/t/${tenantSlug}/announcements/${announcementId}/comments`);
      return res.data.data ?? [];
    },
    enabled: Boolean(announcementId),
  });
}

export function useCreateAnnouncementComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ announcementId, content }: { announcementId: string; content: string }) => {
      const res = await api.post<{ data: AnnouncementComment; message: string }>(`/announcements/${announcementId}/comments`, { content });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcement-comments'] });
    },
  });
}

export function useDeleteAnnouncementComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ announcementId, commentId }: { announcementId: string; commentId: string }) => {
      await api.delete(`/announcements/${announcementId}/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcement-comments'] });
    },
  });
}
