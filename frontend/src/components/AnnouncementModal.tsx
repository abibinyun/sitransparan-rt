import React, { useState } from 'react';
import { Announcement, CreateAnnouncementPayload, AnnouncementTarget } from '../types/announcement_doc';
import { useUploadProof } from '../services/financial';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select } from './ui/select';
import { UploadCloud, Image as ImageIcon } from 'lucide-react';

interface AnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateAnnouncementPayload) => Promise<void>;
  initialData?: Announcement | null;
  isLoading?: boolean;
}

export const AnnouncementModal: React.FC<AnnouncementModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading = false,
}) => {
  const uploadMutation = useUploadProof();
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [attachmentUrl, setAttachmentUrl] = useState(initialData?.attachment_url || '');
  const [mediaUrls, setMediaUrls] = useState((initialData?.media_urls || []).join(', '));
  const [target, setTarget] = useState<AnnouncementTarget>(initialData?.target || 'all');

  React.useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title || '');
      setContent(initialData?.content || '');
      setAttachmentUrl(initialData?.attachment_url || '');
      setMediaUrls((initialData?.media_urls || []).join(', '));
      setTarget(initialData?.target || 'all');
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      title,
      content,
      attachment_url: attachmentUrl || undefined,
      media_urls: mediaUrls.split(',').map((u) => u.trim()).filter(Boolean),
      target,
    });
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Pengumuman' : 'Tambah Pengumuman Baru'}
      description="Buat pengumuman resmi untuk warga RT"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Judul Pengumuman</Label>
          <Input
            id="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Kerja Bakti Hari Minggu"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="content">Isi Pengumuman</Label>
          <textarea
            id="content"
            required
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            placeholder="Tulis detail pengumuman..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bannerInput">Foto Banner / Lampiran</Label>
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-3 text-center hover:border-indigo-400 transition-colors bg-slate-50/50">
            <input
              id="bannerInput"
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              disabled={uploading}
              onChange={async (e) => {
                if (e.target.files && e.target.files[0]) {
                  setUploading(true);
                  try {
                    const res = await uploadMutation.mutateAsync(e.target.files[0]);
                    setAttachmentUrl(res.proof_url);
                  } catch {
                    // ignore
                  } finally {
                    setUploading(false);
                  }
                }
              }}
            />
            <label htmlFor="bannerInput" className="cursor-pointer flex flex-col items-center justify-center gap-1">
              {attachmentUrl ? (
                <div className="flex items-center gap-2 text-emerald-600 font-semibold text-xs truncate max-w-full">
                  <ImageIcon className="w-4 h-4 shrink-0" />
                  <span className="truncate">Foto Terpilih: {attachmentUrl}</span>
                </div>
              ) : (
                <>
                  <UploadCloud className="w-6 h-6 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-700">
                    {uploading ? 'Mengunggah...' : 'Pilih Foto / Gambar Banner'}
                  </span>
                </>
              )}
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mediaUrls">URL Tambahan Foto Galeri (Opsional, pisahkan dengan koma)</Label>
          <Input
            id="mediaUrls"
            type="text"
            value={mediaUrls}
            onChange={(e) => setMediaUrls(e.target.value)}
            placeholder="https://storage.../foto1.jpg, https://storage.../foto2.jpg"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="target">Target Penerima</Label>
          <Select
            id="target"
            value={target}
            onChange={(e) => setTarget(e.target.value as AnnouncementTarget)}
          >
            <option value="all">Semua (Publik & Warga)</option>
            <option value="residents_only">Khusus Warga RT</option>
          </Select>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Menyimpan...' : initialData ? 'Simpan Perubahan' : 'Buat Pengumuman'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
