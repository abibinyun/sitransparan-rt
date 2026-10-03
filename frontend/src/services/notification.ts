import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export interface InAppNotification {
  id: string;
  user_id?: string;
  title: string;
  body: string;
  category: string;
  action_url: string;
  is_read: boolean;
  read_at?: string;
  metadata?: any;
  created_at: string;
}

export interface ListNotificationsResponse {
  data: InAppNotification[];
  total: number;
  limit: number;
  offset: number;
}

export function useNotificationsQuery(unreadOnly = false) {
  return useQuery<ListNotificationsResponse>({
    queryKey: ['notifications', { unreadOnly }],
    queryFn: async () => {
      const res = await api.get<ListNotificationsResponse>('/notifications', {
        params: { unread: unreadOnly ? 'true' : 'false', limit: 30 },
      });
      return res.data;
    },
    refetchInterval: 30000, // Polling santai tiap 30 detik jika push mati
  });
}

export function useUnreadNotificationsCountQuery() {
  return useQuery<number>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const res = await api.get<{ unread_count: number }>('/notifications/unread-count');
      return res.data.unread_count;
    },
    refetchInterval: 15000,
  });
}

export function useMarkNotificationAsReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsAsReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.post('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
