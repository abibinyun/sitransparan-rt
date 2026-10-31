import React from 'react';
import { MessageSquare, CheckCircle2, ThumbsUp, Trash2, Pencil } from 'lucide-react';
import { CommunityPost, useToggleCommunityReactionMutation, useMarkPostSolvedMutation } from '../../services/community';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useAuthStore } from '../../store/useAuthStore';
import { formatRelativeTime } from '../../utils/date';
import { getFileUrl } from '../../utils/file';

interface PostCardProps {
  post: CommunityPost;
  onOpenComments: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onOpenComments, onEdit, onDelete }) => {
  const { user } = useAuthStore();
  const toggleReactionMutation = useToggleCommunityReactionMutation();
  const markSolvedMutation = useMarkPostSolvedMutation();

  const userRole = String(user?.role || '').toLowerCase();
  const isAdmin = userRole === 'admin_rt' || userRole === 'superadmin' || userRole === 'operator';
  const isOwner = user?.id === post.user_id;
  const canDelete = isOwner || isAdmin;
  const isQuestion = post.post_type === 'question';

  const handleReaction = (rType: string) => {
    toggleReactionMutation.mutate({ postId: post.id, reactionType: rType });
  };

  return (
    <div className={`rounded-2xl border p-5 bg-white transition shadow-2xs hover:shadow-xs ${
      post.is_solved ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200'
    }`}>
      {/* Header Post */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
            {post.is_anonymous ? '?' : post.author_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">
                {post.is_anonymous ? 'Warga Lingkungan' : post.author_name}
              </span>
              {post.house_number && !post.is_anonymous && (
                <span className="text-[10px] text-slate-500 font-medium px-1.5 py-0.5 rounded-md bg-slate-100">
                  {post.house_number}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">{formatRelativeTime(post.created_at)}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {post.is_solved && (
            <Badge className="bg-emerald-600 text-white text-[10px] flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Terbantu
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px] capitalize">
            {post.category}
          </Badge>
          {isOwner && onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="text-slate-400 hover:text-blue-600 p-1 rounded-md transition"
              title="Edit Postingan"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          {canDelete && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition"
              title="Hapus Postingan"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <h3 className="text-sm font-bold text-slate-900 mb-1">{post.title}</h3>
      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{post.content}</p>

      {/* Media lampiran */}
      {post.media_urls && post.media_urls.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mt-3 rounded-xl overflow-hidden">
          {post.media_urls.map((url, i) => (
            <img key={i} src={getFileUrl(url)} alt={`Lampiran ${i}`} className="w-full h-36 object-cover rounded-lg bg-slate-100" />
          ))}
        </div>
      )}

      {/* Action footer */}
      <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleReaction('like')}
            className="h-8 px-2.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <ThumbsUp className="w-3.5 h-3.5 mr-1" />
            {post.reactions_count?.like || 0}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleReaction('pray')}
            className="h-8 px-2.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            🙏 {post.reactions_count?.pray || 0}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleReaction('applause')}
            className="h-8 px-2.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            👏 {post.reactions_count?.applause || 0}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {isQuestion && isOwner && !post.is_solved && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markSolvedMutation.mutate({ postId: post.id, helperUserId: user?.id || '' })}
              className="h-8 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-lg"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Tandai Selesai
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenComments}
            className="h-8 px-2.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
            {post.comments_count || 0} Komentar
          </Button>
        </div>
      </div>
    </div>
  );
};
