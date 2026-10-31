import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export interface CommunityPost {
  id: string;
  user_id: string;
  resident_id?: string;
  house_id?: string;
  author_name: string;
  house_number?: string;
  post_type: 'discussion' | 'marketplace' | 'question';
  category: string;
  title: string;
  content: string;
  price?: number;
  contact_phone?: string;
  media_urls?: string[];
  is_solved: boolean;
  solved_by_user_id?: string;
  is_anonymous: boolean;
  reactions_count?: Record<string, number>;
  user_reaction?: string;
  comments_count: number;
  created_at: string;
  updated_at: string;
}

export interface CommunityComment {
  id: string;
  post_id: string;
  parent_comment_id?: string;
  user_id: string;
  author_name: string;
  content: string;
  created_at: string;
}

export function useCommunityPostsQuery(postType = 'all', category = 'all') {
  return useQuery<{ data: CommunityPost[]; total: number }>({
    queryKey: ['community', 'posts', { postType, category }],
    queryFn: async () => {
      const res = await api.get<{ data: CommunityPost[]; total: number }>('/community/posts', {
        params: {
          type: postType === 'all' ? undefined : postType,
          category: category === 'all' ? undefined : category,
          limit: 30,
        },
      });
      return res.data;
    },
  });
}

export function useCreateCommunityPostMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<CommunityPost>) => {
      const res = await api.post<CommunityPost>('/community/posts', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', 'posts'] });
    },
  });
}

export function useUpdateCommunityPostMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<CommunityPost> }) => {
      const res = await api.put<CommunityPost>(`/community/posts/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', 'posts'] });
    },
  });
}

export function useDeleteCommunityPostMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      await api.delete(`/community/posts/${postId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', 'posts'] });
    },
  });
}

export function useCommunityCommentsQuery(postId: string) {
  return useQuery<{ data: CommunityComment[] }>({
    queryKey: ['community', 'comments', postId],
    queryFn: async () => {
      const res = await api.get<{ data: CommunityComment[] }>(`/community/posts/${postId}/comments`);
      return res.data;
    },
    enabled: !!postId,
  });
}

export function useAddCommunityCommentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      postId,
      authorName,
      content,
      parentCommentId,
    }: {
      postId: string;
      authorName: string;
      content: string;
      parentCommentId?: string;
    }) => {
      const res = await api.post<CommunityComment>(`/community/posts/${postId}/comments`, {
        author_name: authorName,
        content,
        parent_comment_id: parentCommentId,
      });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['community', 'comments', variables.postId] });
      queryClient.invalidateQueries({ queryKey: ['community', 'posts'] });
    },
  });
}

export function useDeleteCommunityCommentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, commentId }: { postId: string; commentId: string }) => {
      await api.delete(`/community/posts/${postId}/comments/${commentId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['community', 'comments', variables.postId] });
      queryClient.invalidateQueries({ queryKey: ['community', 'posts'] });
    },
  });
}

export function useToggleCommunityReactionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, reactionType }: { postId: string; reactionType: string }) => {
      await api.post(`/community/posts/${postId}/reactions`, { reaction_type: reactionType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', 'posts'] });
    },
  });
}

export function useMarkPostSolvedMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, helperUserId }: { postId: string; helperUserId: string }) => {
      await api.post(`/community/posts/${postId}/solve`, { helper_user_id: helperUserId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', 'posts'] });
    },
  });
}
