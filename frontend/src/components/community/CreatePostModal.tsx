import React, { useState, useEffect } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { useAuthStore } from '../../store/useAuthStore';
import {
  CommunityPost,
  useCreateCommunityPostMutation,
  useUpdateCommunityPostMutation,
} from '../../services/community';
import { useUploadProof } from '../../services/financial';
import { compressImage } from '../../utils/imageCompressor';
import { getFileUrl } from '../../utils/file';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: 'discussion' | 'marketplace' | 'question';
  editingPost?: CommunityPost | null;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  defaultType = 'discussion',
  editingPost,
}) => {
  const { user } = useAuthStore();
  const [postType, setPostType] = useState<'discussion' | 'marketplace' | 'question'>(defaultType);
  const [category, setCategory] = useState('general');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [price, setPrice] = useState('');
  const [contactPhone, setContactPhone] = useState(user?.phone || '');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const createMutation = useCreateCommunityPostMutation();
  const updateMutation = useUpdateCommunityPostMutation();
  const uploadMutation = useUploadProof();

  const isEditing = Boolean(editingPost);

  useEffect(() => {
    if (editingPost) {
      setPostType(editingPost.post_type as any);
      setCategory(editingPost.category || 'general');
      setTitle(editingPost.title);
      setContent(editingPost.content);
      setPrice(editingPost.price ? String(editingPost.price) : '');
      setContactPhone(editingPost.contact_phone || user?.phone || '');
      setIsAnonymous(editingPost.is_anonymous);
      setMediaUrls(editingPost.media_urls || []);
    } else {
      setPostType(defaultType);
      setCategory('general');
      setTitle('');
      setContent('');
      setPrice('');
      setContactPhone(user?.phone || '');
      setIsAnonymous(false);
      setMediaUrls([]);
    }
    setErrorMsg('');
  }, [editingPost, defaultType, user?.phone, isOpen]);

  const handleUploadImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploading(true);
    setErrorMsg('');

    try {
      const files = Array.from(e.target.files);
      const newUrls: string[] = [];

      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        const compressed = await compressImage(file);
        const res = await uploadMutation.mutateAsync(compressed);
        if (res.proof_url) {
          newUrls.push(res.proof_url);
        }
      }

      setMediaUrls((prev) => [...prev, ...newUrls].slice(0, 5)); // Maksimal 5 foto
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Gagal mengunggah foto');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setMediaUrls((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setErrorMsg('Judul dan isi postingan wajib diisi');
      return;
    }

    try {
      if (isEditing && editingPost) {
        await updateMutation.mutateAsync({
          id: editingPost.id,
          payload: {
            title: title.trim(),
            content: content.trim(),
            price: price ? parseFloat(price) : undefined,
            contact_phone: contactPhone || undefined,
            category,
            media_urls: mediaUrls.length > 0 ? mediaUrls : undefined,
            is_anonymous: isAnonymous,
          },
        });
      } else {
        await createMutation.mutateAsync({
          author_name: user?.name || 'Warga',
          house_number: (user as any)?.house_number || 'Blok Warga',
          post_type: postType,
          category,
          title: title.trim(),
          content: content.trim(),
          price: price ? parseFloat(price) : undefined,
          contact_phone: contactPhone || undefined,
          media_urls: mediaUrls.length > 0 ? mediaUrls : undefined,
          is_anonymous: isAnonymous,
        });
      }

      onClose();
      setTitle('');
      setContent('');
      setPrice('');
      setMediaUrls([]);
      setErrorMsg('');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Gagal menyimpan postingan');
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Kiriman Warga' : 'Buat Kiriman Warga'}
      className="w-[96vw] sm:w-[92vw] max-w-2xl"
      preventOutsideClose={true}
    >
      {errorMsg && (
        <div className="p-3 text-xs bg-rose-50 text-rose-700 rounded-lg border border-rose-200 mb-3">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tipe Postingan Pills */}
        <div>
          <Label className="text-xs font-semibold text-slate-700">Tipe Kiriman</Label>
          <div className="grid grid-cols-3 gap-2 mt-1.5">
            {[
              { id: 'discussion', label: '💬 Obrolan / Info' },
              { id: 'marketplace', label: '🛍️ Lapak Jualan' },
              { id: 'question', label: '❓ Tanya Warga' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setPostType(t.id as any)}
                className={`py-2 px-2 text-xs font-semibold rounded-xl border text-center transition ${
                  postType === t.id
                    ? 'border-blue-600 bg-blue-50 text-blue-800'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-xs font-semibold text-slate-700">Judul</Label>
          <Input
            placeholder={postType === 'marketplace' ? 'Contoh: Nasi Uduk Betawi Bu Joko' : 'Contoh: Rekomendasi Service AC Terpercaya'}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 text-xs"
            required
          />
        </div>

        {postType === 'marketplace' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Harga (Rp)</Label>
              <Input
                type="number"
                placeholder="Contoh: 15000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-700">Nomor WhatsApp</Label>
              <Input
                placeholder="081234567890"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
          </div>
        )}

        <div>
          <Label className="text-xs font-semibold text-slate-700">Isi Pesan / Rincian</Label>
          <Textarea
            placeholder="Tuliskan keterangan lengkap..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="mt-1 text-xs resize-none"
            rows={4}
            required
          />
        </div>

        {/* Upload Foto (Single / Multi) */}
        <div className="space-y-2 pt-1 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-1.5 font-semibold text-slate-800">
              <ImagePlus className="w-4 h-4 text-emerald-600" /> Galeri Foto &amp; Lampiran
            </Label>
            <span className="text-[11px] text-slate-500">Maks. 5 foto</span>
          </div>

          {/* Preview grid */}
          {mediaUrls.length > 0 && (
            <div className="grid grid-cols-5 gap-2 mb-2">
              {mediaUrls.map((url, idx) => (
                <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-square bg-slate-50">
                  <img src={getFileUrl(url)} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white hover:bg-rose-600 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {mediaUrls.length < 5 && (
            <div
              className="border-2 border-dashed border-slate-200 rounded-xl p-3 text-center hover:border-emerald-400 transition-colors bg-slate-50/50"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                id="communityPhotoInput"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                disabled={isUploading}
                onChange={handleUploadImages}
                onClick={(e) => {
                  e.stopPropagation();
                }}
              />
              <label
                htmlFor="communityPhotoInput"
                onClick={(e) => e.stopPropagation()}
                className="cursor-pointer flex flex-col items-center justify-center gap-1"
              >
                <ImagePlus className="w-5 h-5 text-slate-400" />
                <span className="text-xs font-semibold text-slate-700">
                  {isUploading ? 'Mengunggah foto...' : '+ Upload Foto (Pilih satu atau sekaligus)'}
                </span>
              </label>
            </div>
          )}
        </div>

        {postType !== 'marketplace' && (
          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 border-slate-300"
            />
            <span className="text-xs text-slate-600">Kirim sebagai <strong>Warga Lingkungan</strong> (nama disamarkan)</span>
          </label>
        )}

        <div className="pt-2 flex gap-2 justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending || isUploading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
          >
            {createMutation.isPending ? 'Mengirim...' : 'Publikasikan'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
