import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { getTenantSlugOrFallback } from '../utils/tenant';
import { useAuthStore } from '../store/useAuthStore';

export type ReactionType = 'support' | 'like' | 'applause';

export interface ReactionSummary {
  counts: Record<string, number>;
  mine: ReactionType | null;
  total: number;
}

export interface PublicPoll {
  id: string;
  question: string;
  options: string[];
  status: 'open' | 'closed';
  votes?: number[];
  total_votes?: number;
  my_vote?: number | null;
}

export function useReactionSummary(targetType: string, targetId: string) {
  const { user } = useAuthStore();
  return useQuery<ReactionSummary, Error>({
    queryKey: ['reactions', targetType, targetId],
    queryFn: async () => {
      const res = await api.get<ReactionSummary>('/reactions', {
        params: { target_type: targetType, target_id: targetId },
      });
      return res.data;
    },
    // Endpoint butuh login — jangan fetch untuk anonim (hindari spam 401)
    enabled: Boolean(user && targetId),
    staleTime: 30 * 1000,
  });
}

export function useReact(targetType: string, targetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reaction: ReactionType | null) => {
      if (reaction === null) {
        await api.delete('/reactions', {
          params: { target_type: targetType, target_id: targetId },
        });
        return;
      }
      const res = await api.post<ReactionSummary>('/reactions', {
        target_type: targetType,
        target_id: targetId,
        reaction,
      });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reactions', targetType, targetId] });
    },
  });
}

export function useOpenPolls() {
  const slug = getTenantSlugOrFallback();
  const { user } = useAuthStore();
  return useQuery<PublicPoll[], Error>({
    queryKey: ['polls', slug, Boolean(user)],
    queryFn: async () => {
      try {
        // Jika user login: panggil /polls (membawa my_vote)
        // Jika user guest: panggil /t/{slug}/polls (hasil agregat publik)
        const endpoint = user ? '/polls' : `/t/${slug}/polls`;
        const res = await api.get<{ data: PublicPoll[] }>(endpoint);
        return res.data.data ?? [];
      } catch {
        return [];
      }
    },
    staleTime: 60 * 1000,
  });
}

export function useVotePoll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ pollId, optionIndex }: { pollId: string; optionIndex: number }) => {
      const res = await api.post<PublicPoll>(`/polls/${pollId}/vote`, { option_index: optionIndex });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['polls'] });
    },
  });
}

export function useCreatePoll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { question: string; options: string[] }) => {
      const res = await api.post<PublicPoll>('/polls', payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['polls'] });
    },
  });
}

export function useClosePoll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pollId: string) => {
      await api.delete(`/polls/${pollId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['polls'] });
    },
  });
}
