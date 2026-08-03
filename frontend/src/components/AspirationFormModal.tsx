import React, { useState } from 'react';
import { CreateAspirationPayload, AspirationCategory } from '../types/aspiration_need';

interface AspirationFormProps {
  onSubmit: (payload: CreateAspirationPayload) => Promise<void>;
  isLoading?: boolean;
  onClose?: () => void;
}

export const AspirationFormModal: React.FC<AspirationFormProps> = ({
  onSubmit,
  isLoading,
  onClose,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Kirim Aspirasi / Usulan / Keluhan</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Judul</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="Judul aspirasi..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Kategori</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as AspirationCategory)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="suggestion">Usulan</option>
              <option value="complaint">Keluhan</option>
              <option value="question">Pertanyaan</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Isi Aspirasi</label>
            <textarea
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="Jelaskan aspirasi atau keluhan Anda..."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_anonymous"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="is_anonymous" className="text-sm text-gray-700 select-none">
              Kirim secara Anonim (Sembunyikan Identitas)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Batal
              </button>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Mengirim...' : 'Kirim'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
