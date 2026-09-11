import React, { useState } from 'react';
import { Announcement } from '../types/announcement_doc';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import {
  Megaphone,
  Calendar,
  FileText,
  Download,
  Share2,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Send,
  Trash2,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { getFileUrl } from '../utils/file';
import { ReactionButton } from './ReactionButton';
import { useAuthStore } from '../store/useAuthStore';
import {
  useAnnouncementComments,
  useCreateAnnouncementComment,
  useDeleteAnnouncementComment,
} from '../services/announcement_doc';

interface AnnouncementDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcement: Announcement | null;
  onShare?: (item: Announcement) => void;
}

export const AnnouncementDetailModal: React.FC<AnnouncementDetailModalProps> = ({
  isOpen,
  onClose,
  announcement,
  onShare,
}) => {
  const { user } = useAuthStore();
  const roleLower = String(user?.role || '').toLowerCase();
  const isAdmin = roleLower === 'rt_admin' || roleLower === 'superadmin' || roleLower === 'super_admin';
  const isResident = roleLower === 'resident' || isAdmin;

  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState('');

  const { data: comments = [], isLoading: isLoadingComments } = useAnnouncementComments(
    announcement?.allow_comments ? announcement.id : null
  );
  const createCommentMutation = useCreateAnnouncementComment();
  const deleteCommentMutation = useDeleteAnnouncementComment();

  if (!announcement) return null;

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCommentError('');
    const trimmed = commentText.trim();
    if (!trimmed) return;
    if (trimmed.length > 250) {
      setCommentError('Maksimal 250 karakter.');
      return;
    }

    try {
      await createCommentMutation.mutateAsync({
        announcementId: announcement.id,
        content: trimmed,
      });
      setCommentText('');
    } catch (err: any) {
      setCommentError(err?.response?.data?.error || err?.message || 'Gagal mengirim komentar');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Hapus komentar ini?')) return;
    try {
      await deleteCommentMutation.mutateAsync({
        announcementId: announcement.id,
        commentId,
      });
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Gagal menghapus komentar');
    }
  };

  const isImage = (url: string) =>
    /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(url) ||
    url.includes('/proofs/') ||
    url.includes('/files/');

  // Kumpulkan semua gambar (attachment_url jika gambar + media_urls)
  const photos: string[] = [];
  if (announcement.attachment_url && isImage(announcement.attachment_url)) {
    photos.push(announcement.attachment_url);
  }
  if (announcement.media_urls && announcement.media_urls.length > 0) {
    announcement.media_urls.forEach((u) => {
      if (!photos.includes(u)) photos.push(u);
    });
  }

  // Kumpulkan semua berkas lampiran (file_urls + attachment_url jika non-gambar)
  const files: string[] = [];
  if (announcement.attachment_url && !isImage(announcement.attachment_url)) {
    files.push(announcement.attachment_url);
  }
  if (announcement.file_urls && announcement.file_urls.length > 0) {
    announcement.file_urls.forEach((u) => {
      if (!files.includes(u)) files.push(u);
    });
  }

  const handleNextPhoto = () => {
    setActivePhotoIndex((prev) => (prev + 1) % photos.length);
  };

  const handlePrevPhoto = () => {
    setActivePhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title=""
      description=""
      className="max-w-3xl sm:max-w-4xl"
    >
      <div className="space-y-5 max-h-[80vh] overflow-y-auto pr-1">
        {/* Header Badges & Actions */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-100">
                <Megaphone className="w-3 h-3 text-emerald-600" />{' '}
                {announcement.target === 'residents_only' ? 'Khusus Warga RT' : 'Pengumuman Umum'}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(announcement.created_at).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug pt-1">
              {announcement.title}
            </h2>
          </div>

          {onShare && (
            <button
              onClick={() => onShare(announcement)}
              className="p-2 rounded-xl text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors shrink-0"
              title="Bagikan ke WhatsApp"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Galeri Foto Utama dengan Slider & Thumbnails */}
        {photos.length > 0 && (
          <div className="space-y-2">
            <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-video flex items-center justify-center">
              <img
                src={getFileUrl(photos[activePhotoIndex] || photos[0])}
                alt={`${announcement.title} — foto ${activePhotoIndex + 1}`}
                className="max-h-full max-w-full object-contain"
              />

              {photos.length > 1 && (
                <>
                  <button
                    onClick={handlePrevPhoto}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 hover:bg-black/80 p-2 text-white transition-colors"
                    aria-label="Foto sebelumnya"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNextPhoto}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 hover:bg-black/80 p-2 text-white transition-colors"
                    aria-label="Foto berikutnya"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[11px] px-2 py-0.5 rounded-full font-medium">
                    {activePhotoIndex + 1} / {photos.length}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnails jika foto > 1 */}
            {photos.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto py-1">
                {photos.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActivePhotoIndex(idx)}
                    className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                      activePhotoIndex === idx
                        ? 'border-emerald-600 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={getFileUrl(p)}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Isi Pengumuman Lengkap */}
        <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-line bg-slate-50/60 p-4 rounded-xl border border-slate-100">
          {announcement.content}
        </div>

        {/* Berkas & Dokumen Lampiran */}
        {files.length > 0 && (
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-600" /> Berkas Lampiran ({files.length})
            </h4>
            <div className="grid gap-2">
              {files.map((fileUrl, idx) => {
                const fileName = fileUrl.split('/').pop() || `Berkas-Lampiran-${idx + 1}.pdf`;
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-xs transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-900 truncate">{fileName}</p>
                        <p className="text-[11px] text-slate-400">Klik untuk melihat atau mengunduh</p>
                      </div>
                    </div>
                    <a
                      href={getFileUrl(fileUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" /> Buka
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Kolom Komentar Warga (Jika Diaktifkan) */}
        {announcement.allow_comments ? (
          <div className="space-y-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                Komentar Warga ({comments.length})
              </h4>
              <span className="text-[11px] text-slate-400">Terbuka &amp; Transparan</span>
            </div>

            {/* List Komentar Datar (Flat) */}
            {isLoadingComments ? (
              <p className="text-xs text-slate-400 py-2">Memuat komentar...</p>
            ) : comments.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-400">
                Belum ada komentar warga. Jadilah yang pertama memberikan tanggapan.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {comments.map((c) => (
                  <div key={c.id} className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 text-xs space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900">{c.author_name}</span>
                        {c.house_block && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-semibold text-[10px] border border-emerald-200">
                            {c.house_block}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">
                          {new Date(c.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(c.id)}
                          className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 transition"
                          title="Hapus komentar (moderasi)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-slate-700 leading-relaxed break-words">{c.content}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Form Input Komentar (Warga Login) */}
            {isResident ? (
              <form onSubmit={handleSendComment} className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={250}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Tulis tanggapan singkat warga (maks 250 karakter)..."
                    className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={createCommentMutation.isPending || !commentText.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 text-xs px-3"
                  >
                    <Send className="w-3.5 h-3.5 mr-1" /> Kirim
                  </Button>
                </div>
                {commentError && (
                  <p className="text-[11px] text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {commentError}
                  </p>
                )}
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Nama &amp; blok rumah Anda akan ditampilkan terbuka.</span>
                  <span>{commentText.length}/250</span>
                </div>
              </form>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-slate-400" /> Masuk dengan akun warga untuk ikut berkomentar.
                </span>
                <a
                  href={`/login?returnTo=${encodeURIComponent(window.location.pathname)}`}
                  className="font-bold text-emerald-700 hover:underline shrink-0"
                >
                  Masuk Akun
                </a>
              </div>
            )}
          </div>
        ) : null}

        {/* Footer: Reaksi Sosial Warga & Tombol Tutup */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <ReactionButton targetType="announcement" targetId={announcement.id} />
          <Button type="button" variant="outline" onClick={onClose} size="sm">
            Tutup
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
