import React, { useState } from 'react';
import { CreateAspirationPayload, AspirationCategory } from '../types/aspiration_need';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select } from './ui/select';

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
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<AspirationCategory>('suggestion');
  const [isAnonymous, setIsAnonymous] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    await onSubmit({
      title,
      content,
      category,
      is_anonymous: isAnonymous,
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
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="is_anonymous"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <Label htmlFor="is_anonymous" className="cursor-pointer select-none">
            Kirim secara Anonim (Sembunyikan Identitas)
          </Label>
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
