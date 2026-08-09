import React, { useState } from 'react';
import { Announcement, CreateAnnouncementPayload, AnnouncementTarget } from '../types/announcement_doc';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select } from './ui/select';

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
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [attachmentUrl, setAttachmentUrl] = useState(initialData?.attachment_url || '');
  const [target, setTarget] = useState<AnnouncementTarget>(initialData?.target || 'ALL');

  React.useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title || '');
      setContent(initialData?.content || '');
      setAttachmentUrl(initialData?.attachment_url || '');
      setTarget(initialData?.target || 'ALL');
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      title,
      content,
      attachment_url: attachmentUrl || undefined,
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
          <Label htmlFor="attachmentUrl">URL Lampiran (Opsional)</Label>
          <Input
            id="attachmentUrl"
            type="url"
            value={attachmentUrl}
            onChange={(e) => setAttachmentUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="target">Target Penerima</Label>
          <Select
            id="target"
            value={target}
            onChange={(e) => setTarget(e.target.value as AnnouncementTarget)}
          >
            <option value="ALL">Semua (Publik & Warga)</option>
            <option value="RESIDENTS_ONLY">Khusus Warga RT</option>
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
