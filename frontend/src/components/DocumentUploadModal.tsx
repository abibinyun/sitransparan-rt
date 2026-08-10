import React, { useState } from 'react';
import { Document, CreateDocumentPayload, DocumentCategory } from '../types/announcement_doc';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select } from './ui/select';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateDocumentPayload) => Promise<void>;
  initialData?: Document | null;
  isLoading?: boolean;
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading = false,
}) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [category, setCategory] = useState<DocumentCategory | string>(
    initialData?.category || 'financial_report'
  );
  const [fileUrl, setFileUrl] = useState(initialData?.file_url || '');

  React.useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title || '');
      setCategory(initialData?.category || 'financial_report');
      setFileUrl(initialData?.file_url || '');
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      title,
      category,
      file_url: fileUrl,
    });
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Dokumen' : 'Upload Dokumen Baru'}
      description="Unggah berkas atau laporan resmi warga"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="docTitle">Judul Dokumen</Label>
          <Input
            id="docTitle"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Laporan Keuangan Kas RT Bulan Juli 2026"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="docCategory">Kategori Dokumen</Label>
          <Select
            id="docCategory"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="financial_report">Laporan Keuangan</option>
            <option value="minutes">Notulen Rapat</option>
            <option value="letter">Surat Edaran / Resmi</option>
            <option value="other">Lainnya</option>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fileUrl">URL Dokumen / File</Label>
          <Input
            id="fileUrl"
            type="url"
            required
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
            placeholder="https://storage.example.com/file.pdf"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Mengunggah...' : initialData ? 'Simpan Perubahan' : 'Upload Dokumen'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
