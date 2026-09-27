import React, { useState } from 'react';
import { SimpleDialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select } from '../ui/select';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export interface CashCategory {
  id: string;
  name: string;
  type: 'income' | 'expense';
  desc?: string;
}

interface CashCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  cashCats: CashCategory[];
  onSave: (categories: CashCategory[]) => void;
  showFeedback: (type: 'success' | 'error', text: string) => void;
}

export const CashCategoryModal: React.FC<CashCategoryModalProps> = ({
  isOpen,
  onClose,
  cashCats,
  onSave,
  showFeedback,
}) => {
  const [editingCashCat, setEditingCashCat] = useState<CashCategory | null>(null);
  const [newCashCatName, setNewCashCatName] = useState('');
  const [newCashCatType, setNewCashCatType] = useState<'income' | 'expense'>('income');
  const [newCashCatDesc, setNewCashCatDesc] = useState('');

  const handleEdit = (cat: CashCategory) => {
    setEditingCashCat(cat);
    setNewCashCatName(cat.name);
    setNewCashCatType(cat.type);
    setNewCashCatDesc(cat.desc || '');
  };

  const handleCancelEdit = () => {
    setEditingCashCat(null);
    setNewCashCatName('');
    setNewCashCatDesc('');
    setNewCashCatType('income');
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Hapus kategori kas "${name}" ini?`)) {
      const updated = cashCats.filter((c) => c.id !== id);
      onSave(updated);
      if (editingCashCat?.id === id) {
        handleCancelEdit();
      }
      showFeedback('success', `Kategori kas "${name}" berhasil dihapus.`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCashCatName.trim()) return;
    const formattedName = newCashCatName.trim().toUpperCase().replace(/\s+/g, '_');

    if (editingCashCat) {
      const updated = cashCats.map((c) =>
        c.id === editingCashCat.id
          ? { ...c, name: formattedName, type: newCashCatType, desc: newCashCatDesc.trim() || undefined }
          : c
      );
      onSave(updated);
      setEditingCashCat(null);
      showFeedback('success', `Kategori kas "${formattedName}" berhasil diperbarui.`);
    } else {
      if (cashCats.some((c) => c.name.toLowerCase() === formattedName.toLowerCase())) {
        showFeedback('error', 'Kategori dengan nama tersebut sudah ada.');
        return;
      }
      const catObj: CashCategory = {
        id: `custom_${Date.now()}`,
        name: formattedName,
        type: newCashCatType,
        desc: newCashCatDesc.trim() || undefined,
      };
      const updated = [...cashCats, catObj];
      onSave(updated);
      showFeedback('success', `Kategori kas baru "${formattedName}" berhasil ditambahkan.`);
    }

    setNewCashCatName('');
    setNewCashCatDesc('');
    setNewCashCatType('income');
  };

  return (
    <SimpleDialog
      isOpen={isOpen}
      onClose={() => {
        handleCancelEdit();
        onClose();
      }}
      title="Master Kategori Kas Masuk & Keluar"
      description="Kelola pos kategori untuk transaksi pemasukan dan pengeluaran kas buku besar RT"
      className="max-w-4xl"
    >
      <div className="space-y-6">
        {/* Form Tambah / Edit Kategori Kas */}
        <div className="rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] p-4">
          <div className="mb-3 flex justify-between items-center">
            <h4 className="font-semibold text-xs text-[#1d1d1f]">
              {editingCashCat ? `Edit Kategori: ${editingCashCat.name}` : 'Tambah Kategori Kas Baru'}
            </h4>
            {editingCashCat && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                className="text-xs h-7"
              >
                Batal Edit
              </Button>
            )}
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="newCashCatName" className="text-xs font-medium text-[#1d1d1f]">
                  Nama Kategori *
                </Label>
                <Input
                  id="newCashCatName"
                  placeholder="Contoh: BANTUAN_DUKA"
                  value={newCashCatName}
                  onChange={(e) => setNewCashCatName(e.target.value)}
                  className="text-xs h-9 bg-white"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="newCashCatType" className="text-xs font-medium text-[#1d1d1f]">
                  Tipe Kas *
                </Label>
                <Select
                  id="newCashCatType"
                  value={newCashCatType}
                  onChange={(e) => setNewCashCatType(e.target.value as any)}
                  className="text-xs h-9 bg-white"
                >
                  <option value="income">Pemasukan (Income)</option>
                  <option value="expense">Pengeluaran (Expense)</option>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="newCashCatDesc" className="text-xs font-medium text-[#1d1d1f]">
                  Keterangan (Opsional)
                </Label>
                <Input
                  id="newCashCatDesc"
                  placeholder="Catatan peruntukan pos kas"
                  value={newCashCatDesc}
                  onChange={(e) => setNewCashCatDesc(e.target.value)}
                  className="text-xs h-9 bg-white"
                />
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <Button type="submit" size="sm" className="gap-1.5 px-4 h-8 text-xs font-medium apple-btn-primary">
                {editingCashCat ? (
                  <>
                    <Edit2 className="h-3.5 w-3.5" /> Simpan Perubahan
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" /> Simpan Kategori
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Daftar Kategori Pemasukan & Pengeluaran */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Kategori Pemasukan */}
          <div className="rounded-xl border border-[#d2d2d7] bg-white p-4 shadow-xs space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-[#d2d2d7]">
              <h4 className="font-semibold text-sm text-emerald-800 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Kategori Kas Masuk (Income)
              </h4>
              <span className="text-xs text-[#707070] font-mono">
                {cashCats.filter((c) => c.type === 'income').length} kategori
              </span>
            </div>
            <ul className="divide-y divide-[#e2e2e5] text-xs text-[#1d1d1f] max-h-56 overflow-y-auto">
              {cashCats.filter((c) => c.type === 'income').length === 0 ? (
                <li className="py-4 text-center text-[#858585] italic">Belum ada kategori pemasukan.</li>
              ) : (
                cashCats
                  .filter((c) => c.type === 'income')
                  .map((c) => (
                    <li key={c.id} className="py-2 flex justify-between items-center hover:bg-[#f5f5f7] px-1.5 rounded transition">
                      <div>
                        <span className="font-semibold text-[#1d1d1f]">{c.name}</span>
                        {c.desc && <p className="text-[10px] text-[#707070] font-normal">{c.desc}</p>}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(c)}
                          className="text-[#0066cc] hover:text-[#0071e3] h-7 w-7 p-0"
                          title="Edit Kategori"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(c.id, c.name)}
                          className="text-rose-600 hover:text-rose-800 h-7 w-7 p-0"
                          title="Hapus Kategori"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))
              )}
            </ul>
          </div>

          {/* Kategori Pengeluaran */}
          <div className="rounded-xl border border-[#d2d2d7] bg-white p-4 shadow-xs space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-[#d2d2d7]">
              <h4 className="font-semibold text-sm text-rose-800 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500"></span> Kategori Kas Keluar (Expense)
              </h4>
              <span className="text-xs text-[#707070] font-mono">
                {cashCats.filter((c) => c.type === 'expense').length} kategori
              </span>
            </div>
            <ul className="divide-y divide-[#e2e2e5] text-xs text-[#1d1d1f] max-h-56 overflow-y-auto">
              {cashCats.filter((c) => c.type === 'expense').length === 0 ? (
                <li className="py-4 text-center text-[#858585] italic">Belum ada kategori pengeluaran.</li>
              ) : (
                cashCats
                  .filter((c) => c.type === 'expense')
                  .map((c) => (
                    <li key={c.id} className="py-2 flex justify-between items-center hover:bg-[#f5f5f7] px-1.5 rounded transition">
                      <div>
                        <span className="font-semibold text-[#1d1d1f]">{c.name}</span>
                        {c.desc && <p className="text-[10px] text-[#707070] font-normal">{c.desc}</p>}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(c)}
                          className="text-[#0066cc] hover:text-[#0071e3] h-7 w-7 p-0"
                          title="Edit Kategori"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(c.id, c.name)}
                          className="text-rose-600 hover:text-rose-800 h-7 w-7 p-0"
                          title="Hapus Kategori"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </SimpleDialog>
  );
};
