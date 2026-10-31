import React from 'react';
import { ShoppingBag, MessageCircle, Pencil, Trash2 } from 'lucide-react';
import { CommunityPost } from '../../services/community';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { formatRupiah } from '../../services/public_transparency';
import { generateWhatsAppOrderUrl } from '../../utils/whatsapp';
import { useAuthStore } from '../../store/useAuthStore';
import { getFileUrl } from '../../utils/file';

interface MarketplaceCardProps {
  post: CommunityPost;
  onOpenComments: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const MarketplaceCard: React.FC<MarketplaceCardProps> = ({ post, onOpenComments, onEdit, onDelete }) => {
  const { user } = useAuthStore();
  const image = post.media_urls && post.media_urls.length > 0 ? post.media_urls[0] : null;

  const userRole = String(user?.role || '').toLowerCase();
  const isAdmin = userRole === 'admin_rt' || userRole === 'superadmin' || userRole === 'operator';
  const isOwner = user?.id === post.user_id;
  const canDelete = isOwner || isAdmin;

  const handleOrder = () => {
    if (!post.contact_phone) return;
    const url = generateWhatsAppOrderUrl({
      phone: post.contact_phone,
      buyerName: user?.name || 'Warga',
      buyerHouse: (user as any)?.house_number || 'Warga RT',
      productTitle: post.title,
      price: post.price,
    });
    if (url) {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between">
      <div>
        {image && (
          <div className="h-44 w-full overflow-hidden bg-slate-100 relative group">
            <img src={getFileUrl(image)} alt={post.title} className="w-full h-full object-cover" />
            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-90">
              {isOwner && onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-lg transition"
                  title="Edit Lapak"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              {canDelete && onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="bg-rose-600 hover:bg-rose-700 text-white p-1.5 rounded-lg transition"
                  title="Hapus Lapak"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
        <div className="p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] uppercase font-bold tracking-wider">
                {post.category}
              </Badge>
              {!image && (
                <div className="flex items-center gap-1">
                  {isOwner && onEdit && (
                    <button
                      type="button"
                      onClick={onEdit}
                      className="text-slate-400 hover:text-blue-600 p-1 rounded-md transition"
                      title="Edit Lapak"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {canDelete && onDelete && (
                    <button
                      type="button"
                      onClick={onDelete}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition"
                      title="Hapus Lapak"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
            {post.price && (
              <span className="text-sm font-bold text-emerald-600 tabular-nums">
                {formatRupiah(post.price)}
              </span>
            )}
          </div>
          <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{post.title}</h3>
          <p className="text-xs text-slate-600 line-clamp-2 mt-1 leading-relaxed">{post.content}</p>
          <div className="mt-3 text-[11px] text-slate-400">
            Penjual: <span className="font-semibold text-slate-700">{post.author_name}</span> ({post.house_number || 'Warga RT'})
          </div>
        </div>
      </div>

      <div className="p-4 pt-0 flex gap-2 border-t border-slate-100 mt-2">
        <Button
          type="button"
          onClick={handleOrder}
          disabled={!post.contact_phone}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 rounded-xl"
        >
          <ShoppingBag className="w-4 h-4 mr-1.5" />
          Pesan via WA
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onOpenComments}
          className="h-9 px-3 text-slate-600 border-slate-200 hover:bg-slate-50 rounded-xl"
        >
          <MessageCircle className="w-4 h-4 mr-1" />
          {post.comments_count}
        </Button>
      </div>
    </div>
  );
};
