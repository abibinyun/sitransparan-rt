import React, { useState, useEffect } from 'react';
import { SimpleDialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select } from '../ui/select';
import { FeeCategory, FeePeriod } from '../../types/financial';

interface FeeCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: FeeCategory | null;
  userList: any[];
  onSave: (payload: {
    id?: string;
    name: string;
    amount: number;
    period: FeePeriod;
    description?: string;
    pic_user_id?: string | null;
  }) => Promise<void>;
  isSubmitting?: boolean;
}

export const FeeCategoryModal: React.FC<FeeCategoryModalProps> = ({
  isOpen,
  onClose,
  category,
  userList,
  onSave,
  isSubmitting,
}) => {
  const [catName, setCatName] = useState('');
  const [catAmount, setCatAmount] = useState<number>(0);
  const [catPeriod, setCatPeriod] = useState<FeePeriod>('monthly');
  const [catDesc, setCatDesc] = useState('');
  const [catPicUserId, setCatPicUserId] = useState<string>('');

  useEffect(() => {
    if (category) {
      setCatName(category.name);
      setCatAmount(Number(category.amount) || 0);
      setCatPeriod(category.period);
      setCatDesc(category.description || '');
      setCatPicUserId(category.pic_user_id || '');
    } else {
      setCatName('');
      setCatAmount(0);
      setCatPeriod('monthly');
      setCatDesc('');
      setCatPicUserId('');
    }
  }, [category, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim() || catAmount <= 0) return;
    await onSave({
      id: category?.id,
      name: catName.trim(),
      amount: catAmount,
      period: catPeriod,
      description: catDesc.trim() || undefined,
      pic_user_id: catPicUserId ? catPicUserId : null,
    });
  };

  return (
    <SimpleDialog
      isOpen={isOpen}
      onClose={onClose}
      title={category ? 'Edit Jenis / Kategori Iuran' : 'Tambah Jenis / Kategori Iuran'}
      className="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="catName">Nama Jenis Iuran *</Label>
          <Input
            id="catName"
            type="text"
            placeholder="Contoh: Iuran Sampah, Iuran Warga Bulanan"
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="catPic">Penanggung Jawab (PIC Pos Iuran)</Label>
          <Select
            id="catPic"
            value={catPicUserId}
            onChange={(e) => setCatPicUserId(e.target.value)}
          >
            <option value="">-- Pengurus RT Utama (Default) --</option>
            {userList.map((u: any) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email}) - {u.role_name || u.role}
              </option>
            ))}
          </Select>
          <p className="text-[11px] text-[#707070]">
            PIC yang ditunjuk memiliki wewenang mencatat dan memverifikasi setoran iuran warga pada pos ini.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="catAmount">Nominal Tarif (Rp) *</Label>
          <Input
            id="catAmount"
            type="number"
            min="1"
            placeholder="50000"
            value={catAmount || ''}
            onChange={(e) => setCatAmount(Number(e.target.value))}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="catPeriod">Periode Pembayaran *</Label>
          <Select
            id="catPeriod"
            value={catPeriod}
            onChange={(e) => setCatPeriod(e.target.value as FeePeriod)}
          >
            <option value="monthly">Bulanan</option>
            <option value="one_time">Sekali Bayar (Insidental)</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="catDesc">Keterangan (Opsional)</Label>
          <Input
            id="catDesc"
            type="text"
            placeholder="Contoh: Meliputi kebersihan lingkungan dan pos satpam"
            value={catDesc}
            onChange={(e) => setCatDesc(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Menyimpan...' : category ? 'Simpan Perubahan' : 'Simpan Kategori'}
          </Button>
        </div>
      </form>
    </SimpleDialog>
  );
};
