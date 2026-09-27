import React from 'react';
import { SimpleDialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select } from '../ui/select';
import { KarangTarunaPeriod } from '../../types/karang_taruna';

interface KTPeriodModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingPeriod: KarangTarunaPeriod | null;
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

export const KTPeriodModal: React.FC<KTPeriodModalProps> = ({
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
      title={editingPeriod ? 'Edit Masa Bakti Karang Taruna' : 'Buat Masa Bakti Baru'}
      description="Atur nama periode, rentang tanggal kepengurusan, dan nomor SK."
      className="max-w-3xl"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="periodName">Nama Periode</Label>
          <Input
            id="periodName"
            required
            placeholder="Contoh: Masa Bakti 2024-2027"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="startDate">Mulai</Label>
            <Input
              id="startDate"
              type="date"
              required
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">Selesai</Label>
            <Input
              id="endDate"
              type="date"
              required
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="periodStatus">Status Periode</Label>
          <Select
            id="periodStatus"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option value="active">Aktif (Utama)</option>
            <option value="draft">Draft</option>
            <option value="archived">Arsip / Demisioner</option>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="skNumber">Nomor SK Pengukuhan (Opsional)</Label>
          <Input
            id="skNumber"
            placeholder="Contoh: SK-004/RT-03/2024"
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
