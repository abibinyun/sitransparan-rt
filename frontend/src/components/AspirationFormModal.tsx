import React, { useState } from 'react';
import { CreateAspirationPayload, AspirationCategory } from '../types/aspiration_need';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select } from './ui/select';
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
      className="w-[96vw] sm:w-[92vw] max-w-3xl p-4 sm:p-7"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Identitas pengusul otomatis dari akun login */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <span className="text-xs text-slate-500 block">Pengusul Aspirasi (Akun Terdaftar)</span>
          <span className="text-sm font-bold text-slate-800">{displayName}</span>
          {user?.email && <span className="text-xs text-slate-400 block">{user.email}</span>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="aspTitle">Judul</Label>
          <Input
            id="aspTitle"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Judul aspirasi..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="aspCategory">Kategori</Label>
          <Select
            id="aspCategory"
            value={category}
            onChange={(e) => setCategory(e.target.value as AspirationCategory)}
          >
            <option value="suggestion">Usulan</option>
            <option value="complaint">Keluhan</option>
            <option value="question">Pertanyaan</option>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="aspContent">Isi Aspirasi</Label>
          <textarea
            id="aspContent"
            required
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            placeholder="Jelaskan aspirasi atau keluhan Anda..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          {onClose && (
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Mengirim...' : 'Kirim Aspirasi'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
