import React from 'react';
import { SimpleDialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select } from '../ui/select';
import { RTPeriod } from '../../services/rt_structure';

interface RTPeriodModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingPeriod: RTPeriod | null;
  form: {
    name: string;
    start_date: string;
    end_date: string;
    status: string;
    sk_number: string;
  };
  setForm: (form: any) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  isSubmitting?: boolean;
}

export const RTPeriodModal: React.FC<RTPeriodModalProps> = ({
  isOpen,
  onClose,
  editingPeriod,
  form,
  setForm,
  onSubmit,
  isSubmitting,
}) => {
  return (
    <SimpleDialog
      isOpen={isOpen}
      onClose={onClose}
      title={editingPeriod ? 'Edit Masa Bakti Pengurus RT' : 'Buat Masa Bakti Pengurus RT Baru'}
      description="Atur nama periode, rentang tanggal SK kepengurusan RT/RW resmi."
      className="max-w-2xl"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="rtPeriodName">Nama Masa Bakti *</Label>
          <Input
            id="rtPeriodName"
            required
            placeholder="Contoh: Masa Bakti RT 03 Periode 2024 - 2029"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="rtStartDate">Mulai *</Label>
            <Input
              id="rtStartDate"
              type="date"
              required
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rtEndDate">Selesai *</Label>
            <Input
              id="rtEndDate"
              type="date"
              required
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rtStatus">Status</Label>
          <Select
            id="rtStatus"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option value="active">Aktif (Utama)</option>
            <option value="draft">Draft</option>
            <option value="archived">Arsip / Demisioner</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rtSKNumber">Nomor SK Pengukuhan (Opsional)</Label>
          <Input
            id="rtSKNumber"
            placeholder="Contoh: SK.04/RW.05/KEL.MELATI/2024"
            value={form.sk_number}
            onChange={(e) => setForm({ ...form, sk_number: e.target.value })}
          />
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-[#d2d2d7]">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting} className="apple-btn-primary">
            {editingPeriod ? 'Simpan Perubahan' : 'Terbitkan Periode'}
          </Button>
        </div>
      </form>
    </SimpleDialog>
  );
};
