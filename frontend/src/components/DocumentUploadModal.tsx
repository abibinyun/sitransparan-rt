import React, { useState } from 'react';
import { Document, CreateDocumentPayload, DocumentCategory } from '../types/announcement_doc';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select } from './ui/select';
import { UploadCloud, FileText } from 'lucide-react';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateDocumentPayload | FormData) => Promise<void>;
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
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState(initialData?.file_url || '');

  React.useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title || '');
      setCategory(initialData?.category || 'financial_report');
      setFileUrl(initialData?.file_url || '');
      setFile(null);
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (file) {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('category', category);
      formData.append('file', file);
      await onSubmit(formData);
    } else {
      await onSubmit({
        title,
        category,
        file_url: fileUrl,
      });
    }
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Dokumen' : 'Upload Dokumen Baru'}
      description="Unggah berkas atau laporan resmi warga"
      className="w-[96vw] sm:w-[92vw] max-w-3xl"
      preventOutsideClose={true}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="docTitle" className="text-xs sm:text-sm font-semibold">Judul Dokumen</Label>
          <Input
            id="docTitle"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Laporan Keuangan Kas RT Bulan Juli 2026"
            className="text-xs sm:text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="docCategory" className="text-xs sm:text-sm font-semibold">Kategori Dokumen</Label>
          <Select
            id="docCategory"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="text-xs sm:text-sm"
          >
            <option value="financial_report">Laporan Keuangan</option>
            <option value="minutes">Notulen Rapat</option>
            <option value="letter">Surat Edaran / Resmi</option>
            <option value="other">Lainnya</option>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="docFileInput" className="text-xs sm:text-sm font-semibold">Pilih File Dokumen</Label>
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-indigo-400 transition-colors bg-slate-50/50">
            <input
              id="docFileInput"
              type="file"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setFile(e.target.files[0]);
                }
              }}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            />
            <label
              htmlFor="docFileInput"
              className="cursor-pointer flex flex-col items-center justify-center gap-2"
            >
              {file ? (
                <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs sm:text-sm max-w-full truncate px-2">
                  <FileText className="w-5 h-5 shrink-0" />
                  <span className="truncate">{file.name} ({(file.size / 1024).toFixed(0)} KB)</span>
                </div>
              ) : (
                <>
                  <UploadCloud className="w-7 h-7 sm:w-8 sm:h-8 text-slate-400" />
                  <span className="text-xs sm:text-sm font-semibold text-slate-700">Pilih berkas dari perangkat</span>
                  <span className="text-[11px] sm:text-xs text-slate-400">PDF, Word, Excel, Gambar (max 10MB)</span>
                </>
              )}
            </label>
          </div>
          {fileUrl && !file && (
            <p className="text-xs text-slate-500 break-all">Berkas saat ini: {fileUrl}</p>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Batal
          </Button>
          <Button type="submit" disabled={isLoading || (!file && !fileUrl)} className="w-full sm:w-auto">
            {isLoading ? 'Mengunggah...' : initialData ? 'Simpan Perubahan' : 'Upload Dokumen'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
