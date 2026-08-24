import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { getTenantSlugOrFallback } from '../utils/tenant';

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
  return useQuery<ReactionSummary, Error>({
    queryKey: ['reactions', targetType, targetId],
    queryFn: async () => {
      const res = await axios.get<ReactionSummary>('/api/v1/reactions', {
        params: { target_type: targetType, target_id: targetId },
      });
      return res.data;
    },
    enabled: Boolean(targetId),
    staleTime: 30 * 1000,
  });
}

export function useReact(targetType: string, targetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reaction: ReactionType | null) => {
      if (reaction === null) {
        await axios.delete('/api/v1/reactions', {
          params: { target_type: targetType, target_id: targetId },
        });
        return;
      }
      const res = await axios.post<ReactionSummary>('/api/v1/reactions', {
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
  return useQuery<PublicPoll[], Error>({
    queryKey: ['polls', slug],
    queryFn: async () => {
      try {
        const res = await axios.get<{ data: PublicPoll[] }>('/api/v1/polls');
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
      const res = await axios.post<PublicPoll>(`/api/v1/polls/${pollId}/vote`, { option_index: optionIndex });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['polls'] });
    },
  });
}
