import React, { useState } from 'react';
import { Announcement, CreateAnnouncementPayload, AnnouncementTarget } from '../types/announcement_doc';
import { useUploadProof } from '../services/financial';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { NativeSelect } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Textarea } from './ui/textarea';
import { UploadCloud, Image as ImageIcon, FileText, Trash2, Plus } from 'lucide-react';
import { getFileUrl } from '../utils/file';
import { compressImage } from '../utils/imageCompressor';

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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [attachmentUrl, setAttachmentUrl] = useState(initialData?.attachment_url || '');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const [category, setCategory] = useState<string>(initialData?.category || 'pengumuman');
  const [target, setTarget] = useState<AnnouncementTarget>(initialData?.target || 'all');
  const [allowComments, setAllowComments] = useState<boolean>(initialData?.allow_comments ?? false);
  const [createdAt, setCreatedAt] = useState<string>(() => {
    if (initialData?.created_at) {
      const d = new Date(initialData.created_at);
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [customFileUrl, setCustomFileUrl] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title || '');
      setContent(initialData?.content || '');
      setAttachmentUrl(initialData?.attachment_url || '');
      setMediaUrls(initialData?.media_urls || []);
      setFileUrls(initialData?.file_urls || []);
      setCategory(initialData?.category || 'pengumuman');
      setTarget(initialData?.target || 'all');
      setAllowComments(initialData?.allow_comments ?? false);
      if (initialData?.created_at) {
        const d = new Date(initialData.created_at);
        const pad = (n: number) => n.toString().padStart(2, '0');
        setCreatedAt(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
      } else {
        const d = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
        setCreatedAt(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
      }
      setCustomImageUrl('');
      setCustomFileUrl('');
    }
  }, [isOpen, initialData]);

  const handleUploadImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingImage(true);
    try {
      const files = Array.from(e.target.files);
      const uploadedUrls: string[] = [];

      for (const file of files) {
        const compressed = await compressImage(file, { maxWidth: 1920, maxHeight: 1920, quality: 0.8 });
        const res = await uploadMutation.mutateAsync(compressed);
        if (res.proof_url) {
          uploadedUrls.push(res.proof_url);
        }
      }

      if (uploadedUrls.length > 0) {
        if (!attachmentUrl) {
          // Gambar pertama jadi gambar utama
          setAttachmentUrl(uploadedUrls[0]);
          // Sisanya masuk ke foto tambahan
          if (uploadedUrls.length > 1) {
            setMediaUrls((prev) => [...prev, ...uploadedUrls.slice(1)]);
          }
        } else {
          // Jika sudah ada gambar utama, semua gambar baru masuk ke foto tambahan
          setMediaUrls((prev) => [...prev, ...uploadedUrls]);
        }
      }
    } catch {
      // ignore
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  // Fungsi untuk menjadikan foto tertentu dari mediaUrls sebagai gambar utama (cover)
  const setAsCoverPhoto = (idx: number) => {
    const chosenUrl = mediaUrls[idx];
    if (!chosenUrl) return;
    const oldCover = attachmentUrl;
    setAttachmentUrl(chosenUrl);
    // Masukkan cover lama ke mediaUrls menggantikan chosenUrl
    setMediaUrls((prev) => {
      const updated = [...prev];
      if (oldCover) {
        updated[idx] = oldCover;
      } else {
        updated.splice(idx, 1);
      }
      return updated;
    });
  };

  const handleUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingFile(true);
    try {
      const files = Array.from(e.target.files);
      for (const file of files) {
        const res = await uploadMutation.mutateAsync(file);
        setFileUrls((prev) => [...prev, res.proof_url]);
      }
    } catch {
      // ignore
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const addCustomImage = () => {
    const trimmed = customImageUrl.trim();
    if (!trimmed) return;
    if (!attachmentUrl) {
      setAttachmentUrl(trimmed);
    } else {
      setMediaUrls((prev) => [...prev, trimmed]);
    }
    setCustomImageUrl('');
  };

  const addCustomFile = () => {
    const trimmed = customFileUrl.trim();
    if (!trimmed) return;
    setFileUrls((prev) => [...prev, trimmed]);
    setCustomFileUrl('');
  };

  const removeMedia = (idx: number) => {
    setMediaUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  const removeFile = (idx: number) => {
    setFileUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      title,
      content,
      attachment_url: attachmentUrl || undefined,
      media_urls: mediaUrls,
      file_urls: fileUrls,
      category,
      target,
      allow_comments: allowComments,
      created_at: createdAt ? new Date(createdAt).toISOString() : undefined,
    });
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Pengumuman' : 'Tambah Pengumuman Baru'}
      description="Buat pengumuman resmi untuk warga RT lengkap dengan multi foto dan berkas lampiran"
      className="w-[96vw] sm:w-[92vw] max-w-4xl"
      preventOutsideClose={true}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="title" className="text-xs sm:text-sm font-semibold">Judul Pengumuman</Label>
          <Input
            id="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Kerja Bakti & Pengurasan Saluran"
            className="text-xs sm:text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="content" className="text-xs sm:text-sm font-semibold">Isi Pengumuman (Opsional)</Label>
          <Textarea
            id="content"
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Tulis detail pengumuman secara rinci (opsional bila hanya foto/lampiran)..."
          />
        </div>

        {/* Multi Foto / Banner */}
        <div className="space-y-2 pt-1 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-1.5 font-semibold text-slate-800">
              <ImageIcon className="w-4 h-4 text-emerald-600" /> Galeri Foto &amp; Banner
            </Label>
            <span className="text-[11px] text-slate-500">Bisa upload banyak foto</span>
          </div>

          {/* Banner Utama */}
          {attachmentUrl ? (
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/50">
              <div className="flex items-center gap-2 overflow-hidden">
                <img
                  src={getFileUrl(attachmentUrl)}
                  alt="Banner utama"
                  className="w-10 h-10 rounded object-cover border border-emerald-300 shrink-0"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="truncate text-xs">
                  <span className="font-semibold text-emerald-900 block">Banner Utama</span>
                  <span className="text-slate-600 truncate block">{attachmentUrl}</span>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-rose-600 hover:bg-rose-50 h-8 w-8 p-0 shrink-0"
                onClick={() => setAttachmentUrl('')}
                title="Hapus banner utama"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ) : null}

          {/* Daftar Foto Tambahan */}
          {mediaUrls.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-slate-600">Foto Tambahan ({mediaUrls.length}):</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {mediaUrls.map((url, idx) => (
                  <div key={idx} className="relative group border border-[#d2d2d7] rounded-lg overflow-hidden bg-[#f5f5f7] aspect-video flex items-center justify-center">
                    <img
                      src={getFileUrl(url)}
                      alt={`Foto ${idx + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                      <button
                        type="button"
                        onClick={() => setAsCoverPhoto(idx)}
                        className="bg-white text-[#1d1d1f] hover:bg-[#f5f5f7] text-[10px] font-semibold px-2 py-1 rounded shadow-xs"
                        title="Jadikan gambar utama"
                      >
                        Jadikan Utama
                      </button>
                      <button
                        type="button"
                        onClick={() => removeMedia(idx)}
                        className="bg-rose-600 text-white rounded p-1 shadow-xs hover:bg-rose-700 transition"
                        title="Hapus foto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Button Foto */}
          <div
            className="border-2 border-dashed border-slate-200 rounded-xl p-3 text-center hover:border-emerald-400 transition-colors bg-slate-50/50"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              id="bannerInput"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={uploadingImage}
              onChange={handleUploadImages}
              onClick={(e) => {
                // Cegah bubbling yang bisa mentrigger event form submit atau parent click
                e.stopPropagation();
              }}
            />
            <label
              htmlFor="bannerInput"
              onClick={(e) => e.stopPropagation()}
              className="cursor-pointer flex flex-col items-center justify-center gap-1"
            >
              <UploadCloud className="w-5 h-5 text-slate-400" />
              <span className="text-xs font-semibold text-slate-700">
                {uploadingImage ? 'Mengunggah foto...' : '+ Upload Foto (Pilih satu atau sekaligus)'}
              </span>
            </label>
          </div>

          {/* Input Manual URL Foto */}
          <div className="flex items-center gap-1.5 pt-1">
            <Input
              type="text"
              placeholder="Atau tempel URL gambar (https://...)"
              value={customImageUrl}
              onChange={(e) => setCustomImageUrl(e.target.value)}
              className="text-xs h-8"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs shrink-0"
              onClick={addCustomImage}
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Tambah
            </Button>
          </div>
        </div>

        {/* Multi Berkas / Dokumen Lampiran */}
        <div className="space-y-2 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-1.5 font-semibold text-slate-800">
              <FileText className="w-4 h-4 text-indigo-600" /> Lampiran Berkas Dokumen (PDF, Surat, Undangan)
            </Label>
            <span className="text-[11px] text-slate-500">Multi berkas</span>
          </div>

          {fileUrls.length > 0 && (
            <div className="space-y-1.5">
              {fileUrls.map((url, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="truncate text-slate-700">{url}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-rose-600 hover:bg-rose-50 h-7 w-7 p-0 shrink-0"
                    onClick={() => removeFile(idx)}
                    title="Hapus berkas"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div
            className="border-2 border-dashed border-slate-200 rounded-xl p-3 text-center hover:border-indigo-400 transition-colors bg-slate-50/50"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              id="fileInput"
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf"
              multiple
              className="hidden"
              disabled={uploadingFile}
              onChange={handleUploadFiles}
              onClick={(e) => {
                e.stopPropagation();
              }}
            />
            <label
              htmlFor="fileInput"
              onClick={(e) => e.stopPropagation()}
              className="cursor-pointer flex flex-col items-center justify-center gap-1"
            >
              <UploadCloud className="w-5 h-5 text-slate-400" />
              <span className="text-xs font-semibold text-slate-700">
                {uploadingFile ? 'Mengunggah berkas...' : '+ Upload Dokumen Lampiran (PDF/File)'}
              </span>
            </label>
          </div>

          <div className="flex items-center gap-1.5 pt-1">
            <Input
              type="text"
              placeholder="Atau tempel URL berkas (https://... atau /uploads/...)"
              value={customFileUrl}
              onChange={(e) => setCustomFileUrl(e.target.value)}
              className="text-xs h-8"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs shrink-0"
              onClick={addCustomFile}
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Tambah
            </Button>
          </div>
        </div>

        {/* Kategori Konten, Visibilitas, dan Waktu Publikasi */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#d2d2d7]">
          <div className="space-y-1.5">
            <Label htmlFor="category" className="text-xs sm:text-sm font-semibold">Kategori Konten</Label>
            <NativeSelect
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="pengumuman">📢 Pengumuman Resmi RT</option>
              <option value="kegiatan">🗓️ Kegiatan &amp; Gotong Royong</option>
              <option value="santai">☕ Kabar Santai / Nongkrong</option>
              <option value="info">ℹ️ Informasi / Tips Lingkungan</option>
            </NativeSelect>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="target" className="text-xs sm:text-sm font-semibold">Visibilitas Akses</Label>
            <NativeSelect
              id="target"
              value={target}
              onChange={(e) => setTarget(e.target.value as AnnouncementTarget)}
            >
              <option value="all">🌐 Publik &amp; Warga (Semua Orang)</option>
              <option value="residents_only">🔒 Khusus Internal Warga RT</option>
            </NativeSelect>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="createdAt" className="text-xs sm:text-sm font-semibold">Waktu &amp; Tanggal Publikasi</Label>
            <Input
              id="createdAt"
              type="datetime-local"
              required
              value={createdAt}
              onChange={(e) => setCreatedAt(e.target.value)}
              className="text-xs sm:text-sm h-10"
            />
          </div>
        </div>

        {/* Sakelar Kolom Komentar */}
        <div className="pt-2 border-t border-slate-100">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <Checkbox
              checked={allowComments}
              onCheckedChange={(checked) => setAllowComments(Boolean(checked))}
              className="mt-0.5"
            />
            <div>
              <span className="text-xs font-bold text-slate-800 block">Buka Kolom Komentar untuk Warga</span>
              <span className="text-[11px] text-slate-500 block">
                Jika diaktifkan, warga yang telah login dapat memberikan tanggapan resmi (nama &amp; blok rumah ditampilkan terbuka).
              </span>
            </div>
          </label>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Batal
          </Button>
          <Button type="submit" disabled={isLoading || uploadingImage || uploadingFile} className="w-full sm:w-auto">
            {isLoading ? 'Menyimpan...' : initialData ? 'Simpan Perubahan' : 'Buat Pengumuman'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

