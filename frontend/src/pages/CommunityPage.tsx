import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MessageSquare, Sparkles, LogIn, Lock } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import {
  useCommunityPostsQuery,
  useDeleteCommunityPostMutation,
  CommunityPost,
} from '../services/community';
import { PostCard } from '../components/community/PostCard';
import { MarketplaceCard } from '../components/community/MarketplaceCard';
import { CommentThreadModal } from '../components/community/CommentThreadModal';
import { CreatePostModal } from '../components/community/CreatePostModal';
import { PanicButtonWidget } from '../components/safety/PanicButtonWidget';
import { Button } from '../components/ui/button';

export const CommunityPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'marketplace' | 'question' | 'discussion'>('all');
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<CommunityPost | null>(null);

  const { data, isLoading } = useCommunityPostsQuery(activeTab, 'all');
  const deletePostMutation = useDeleteCommunityPostMutation();
  const posts = data?.data || [];

  const handleOpenCreate = () => {
    if (!user) {
      navigate('/login?redirect=/community');
      return;
    }
    setEditingPost(null);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (post: CommunityPost) => {
    if (!user) {
      navigate('/login?redirect=/community');
      return;
    }
    setEditingPost(post);
    setIsCreateOpen(true);
  };

  const handleDeletePost = async (post: CommunityPost) => {
    if (!window.confirm(`Yakin ingin menghapus kiriman "${post.title}"?`)) return;
    try {
      await deletePostMutation.mutateAsync(post.id);
    } catch {
      alert('Gagal menghapus kiriman');
    }
  };

  const handleOpenComments = (post: CommunityPost) => {
    if (!user) {
      navigate('/login?redirect=/community');
      return;
    }
    setSelectedPost(post);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 py-6">
      {/* Banner Khusus Pengguna Tamu (Belum Login) */}
      {!user && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 shrink-0">
              <Lock className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Ruang Komunitas Terbuka Khusus Warga</h3>
              <p className="text-xs text-blue-100 mt-0.5">
                Masuk dengan akun warga untuk berdiskusi, bertanya rekomendasi, atau membuka lapak UMKM RT.
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => navigate('/login?redirect=/community')}
            className="bg-white text-blue-900 hover:bg-blue-50 font-bold text-xs h-9 px-4 rounded-xl shrink-0"
          >
            <LogIn className="w-3.5 h-3.5 mr-1.5" /> Masuk Akun Warga
          </Button>
        </div>
      )}

      {/* Tombol Darurat Lingkungan di Atas (Hanya jika login) */}
      {user && <PanicButtonWidget />}

      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-500" /> Ruang Warga & Lapak Tetangga
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Wadah obrolan hangat, tanya rekomendasi, dan jual-beli sesama tetangga lingkungan RT
          </p>
        </div>

        <Button
          type="button"
          onClick={handleOpenCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-10 px-4 rounded-xl shrink-0"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Buat Kiriman
        </Button>
      </div>

      {/* Filter Tabs Pills (Model C Hybrid) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'all', label: '🌟 Semua Kiriman' },
          { id: 'marketplace', label: '🛍️ Lapak Jualan' },
          { id: 'question', label: '❓ Tanya Warga' },
          { id: 'discussion', label: '💬 Obrolan Santai' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-xs font-semibold rounded-full border whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Konten Linimasa */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-400">Memuat kabar tetangga...</div>
      ) : posts.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-200">
          <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">Belum ada kiriman di kategori ini</p>
          <p className="text-xs text-slate-400 mt-1">Mulai diskusi atau tawarkan produk dagangan Anda!</p>
        </div>
      ) : activeTab === 'marketplace' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {posts.map((post) => (
            <MarketplaceCard
              key={post.id}
              post={post}
              onOpenComments={() => handleOpenComments(post)}
              onEdit={() => handleOpenEdit(post)}
              onDelete={() => handleDeletePost(post)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            post.post_type === 'marketplace' ? (
              <MarketplaceCard
                key={post.id}
                post={post}
                onOpenComments={() => handleOpenComments(post)}
                onEdit={() => handleOpenEdit(post)}
                onDelete={() => handleDeletePost(post)}
              />
            ) : (
              <PostCard
                key={post.id}
                post={post}
                onOpenComments={() => handleOpenComments(post)}
                onEdit={() => handleOpenEdit(post)}
                onDelete={() => handleDeletePost(post)}
              />
            )
          ))}
        </div>
      )}

      {/* Modal Buat Kiriman */}
      {isCreateOpen && (
        <CreatePostModal
          isOpen={isCreateOpen}
          onClose={() => {
            setIsCreateOpen(false);
            setEditingPost(null);
          }}
          defaultType={activeTab === 'all' ? 'discussion' : (activeTab as any)}
          editingPost={editingPost}
        />
      )}

      {/* Modal Thread Komentar */}
      {selectedPost && (
        <CommentThreadModal
          post={selectedPost}
          isOpen={Boolean(selectedPost)}
          onClose={() => setSelectedPost(null)}
        />
      )}
    </div>
  );
};

export default CommunityPage;
