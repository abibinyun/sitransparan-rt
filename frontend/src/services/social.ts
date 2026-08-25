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
      const res = await api.get<ReactionSummary>('/api/v1/reactions', {
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
        await api.delete('/api/v1/reactions', {
          params: { target_type: targetType, target_id: targetId },
        });
        return;
      }
      const res = await api.post<ReactionSummary>('/api/v1/reactions', {
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
    queryKey: ['polls', slug],
    queryFn: async () => {
      try {
        const res = await api.get<{ data: PublicPoll[] }>('/api/v1/polls');
        return res.data.data ?? [];
      } catch {
        return [];
      }
    },
    // Endpoint polling berada di balik auth — anonim tidak fetch
    enabled: Boolean(user),
    staleTime: 60 * 1000,
  });
}

export function useVotePoll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ pollId, optionIndex }: { pollId: string; optionIndex: number }) => {
      const res = await api.post<PublicPoll>(`/api/v1/polls/${pollId}/vote`, { option_index: optionIndex });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['polls'] });
    },
  });
}
