import React, { useState } from 'react';
import { CreateAspirationPayload, AspirationCategory } from '../types/aspiration_need';
import { Dialog } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select } from './ui/select';
import { Textarea } from './ui/textarea';
import { useAuthStore } from '../store/useAuthStore';

interface AspirationFormProps {
  onSubmit: (payload: CreateAspirationPayload) => Promise<void>;
  isLoading?: boolean;
  onClose?: () => void;
  isOpen?: boolean;
}

export const AspirationFormModal: React.FC<AspirationFormProps> = ({
  onSubmit,
  isLoading,
  onClose,
  isOpen = true,
}) => {
  const { user } = useAuthStore();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<AspirationCategory>('suggestion');

  // Nama pengusul murni diambil dari akun login saat ini
  const displayName = user?.name || user?.email || 'Warga RT';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    await onSubmit({
      title: title.trim(),
      author_name: displayName,
      content: content.trim(),
      category,
      is_anonymous: false,
    });
    if (onClose) onClose();
  };

  const handleClose = () => {
    if (onClose) onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Kirim Aspirasi / Usulan / Keluhan"
      description="Sampaikan aspirasi Anda untuk kemajuan lingkungan RT"
      className="w-[96vw] sm:w-[92vw] max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Identitas pengusul otomatis dari akun login */}
        <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-lg p-3.5">
          <span className="text-xs text-[#707070] block">Pengusul Aspirasi (Akun Terdaftar)</span>
          <span className="text-sm font-semibold text-[#1d1d1f]">{displayName}</span>
          {user?.email && <span className="text-xs text-[#707070] block">{user.email}</span>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="aspTitle" className="text-[#1d1d1f] text-xs font-semibold">Judul</Label>
          <Input
            id="aspTitle"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Judul aspirasi..."
            className="bg-[#f5f5f7] border border-[#d2d2d7] text-[#1d1d1f] placeholder-[#858585] rounded-lg focus:border-[#0071e3] focus:bg-white"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="aspCategory" className="text-[#1d1d1f] text-xs font-semibold">Kategori</Label>
          <Select
            id="aspCategory"
            value={category}
            onChange={(e) => setCategory(e.target.value as AspirationCategory)}
            className="bg-[#f5f5f7] border border-[#d2d2d7] text-[#1d1d1f] rounded-lg focus:border-[#0071e3] focus:bg-white"
          >
            <option value="suggestion">Usulan</option>
            <option value="complaint">Keluhan</option>
            <option value="question">Pertanyaan</option>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="aspContent" className="text-[#1d1d1f] text-xs font-semibold">Isi Aspirasi</Label>
          <Textarea
            id="aspContent"
            required
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Jelaskan aspirasi atau keluhan Anda..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-[#d2d2d7]">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="apple-btn-secondary text-xs px-4 py-1.5"
            >
              Batal
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="apple-btn-primary text-xs px-5 py-1.5 disabled:opacity-50"
          >
            {isLoading ? 'Mengirim...' : 'Kirim Aspirasi'}
          </button>
        </div>
      </form>
    </Dialog>
  );
};
