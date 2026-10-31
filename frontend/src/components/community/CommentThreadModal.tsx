import React, { useState } from 'react';
import { Send, X, Trash2 } from 'lucide-react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import {
  CommunityPost,
  useCommunityCommentsQuery,
  useAddCommunityCommentMutation,
  useDeleteCommunityCommentMutation,
  CommunityComment,
} from '../../services/community';
import { useAuthStore } from '../../store/useAuthStore';
import { formatRelativeTime } from '../../utils/date';

interface CommentThreadModalProps {
  post: CommunityPost;
  isOpen: boolean;
  onClose: () => void;
}

export const CommentThreadModal: React.FC<CommentThreadModalProps> = ({ post, isOpen, onClose }) => {
  const { user } = useAuthStore();
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<CommunityComment | null>(null);

  const { data: commentsData, isLoading } = useCommunityCommentsQuery(post.id);
  const addCommentMutation = useAddCommunityCommentMutation();
  const deleteCommentMutation = useDeleteCommunityCommentMutation();

  const userRole = String(user?.role || '').toLowerCase();
  const isAdmin = userRole === 'admin_rt' || userRole === 'superadmin' || userRole === 'operator';
  const isPostOwner = user?.id === post.user_id;

  const comments = commentsData?.data || [];
  // Susun komentar berjenjang: parent comments dan child replies
  const rootComments = comments.filter((c) => !c.parent_comment_id);
  const getReplies = (parentId: string) => comments.filter((c) => c.parent_comment_id === parentId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    await addCommentMutation.mutateAsync({
      postId: post.id,
      authorName: user?.name || 'Warga',
      content: content.trim(),
      parentCommentId: replyTo?.id,
    });

    setContent('');
    setReplyTo(null);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Yakin ingin menghapus komentar ini?')) return;
    await deleteCommentMutation.mutateAsync({ postId: post.id, commentId });
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={`Komentar: ${post.title}`} className="sm:max-w-[500px]">
      {/* List Komentar */}
      <div className="max-h-[350px] overflow-y-auto space-y-4 divide-y divide-slate-100">
        {isLoading ? (
          <div className="text-center text-xs text-slate-400 py-6">Memuat diskusi...</div>
        ) : rootComments.length === 0 ? (
          <div className="text-center text-xs text-slate-400 py-8">
            Belum ada komentar. Jadilah yang pertama menanggapi!
          </div>
        ) : (
          rootComments.map((root) => {
            const replies = getReplies(root.id);
            const canDeleteRoot = user?.id === root.user_id || isPostOwner || isAdmin;

            return (
              <div key={root.id} className="pt-3 first:pt-0">
                <div className="flex gap-2.5 items-start">
                  <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-[10px] text-slate-700 shrink-0">
                    {root.author_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900">{root.author_name}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400">{formatRelativeTime(root.created_at)}</span>
                        {canDeleteRoot && (
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(root.id)}
                            className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition"
                            title="Hapus komentar"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">{root.content}</p>
                    <button
                      type="button"
                      onClick={() => setReplyTo(root)}
                      className="text-[10px] text-blue-600 font-semibold hover:underline mt-1 inline-block"
                    >
                      Balas
                    </button>

                    {/* Child Replies */}
                    {replies.length > 0 && (
                      <div className="mt-2.5 space-y-2.5 pl-4 border-l-2 border-slate-100">
                        {replies.map((reply) => {
                          const canDeleteReply = user?.id === reply.user_id || isPostOwner || isAdmin;
                          return (
                            <div key={reply.id} className="flex gap-2 items-start">
                              <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[9px] text-slate-600 shrink-0">
                                {reply.author_name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[11px] font-bold text-slate-800">{reply.author_name}</span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] text-slate-400">{formatRelativeTime(reply.created_at)}</span>
                                    {canDeleteReply && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteComment(reply.id)}
                                        className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition"
                                        title="Hapus balasan"
                                      >
                                        <Trash2 className="w-2.5 h-2.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{reply.content}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Bar Form */}
      <form onSubmit={handleSubmit} className="pt-3 border-t border-slate-100">
        {replyTo && (
          <div className="flex items-center justify-between bg-blue-50 px-3 py-1 rounded-lg text-[11px] text-blue-700 mb-2">
            <span>Membalas ke <strong>{replyTo.author_name}</strong></span>
            <button type="button" onClick={() => setReplyTo(null)} className="hover:text-blue-900">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <Textarea
            placeholder={replyTo ? "Tulis balasan Anda..." : "Tulis komentar atau sebut @tetangga..."}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="text-xs resize-none bg-white min-h-[40px] max-h-[80px]"
            rows={1}
            required
          />
          <Button
            type="submit"
            size="sm"
            disabled={addCommentMutation.isPending || !content.trim()}
            className="h-10 px-3 bg-blue-600 hover:bg-blue-700 text-white shrink-0 rounded-xl"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
