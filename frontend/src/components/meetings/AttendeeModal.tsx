import React from 'react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface AttendeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: {
    name: string;
    role_or_title: string;
  };
  setForm: (form: any) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  isSubmitting?: boolean;
}

export const AttendeeModal: React.FC<AttendeeModalProps> = ({
  isOpen,
  onClose,
  form,
  setForm,
  onSubmit,
  isSubmitting,
}) => {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Tambah Peserta Hadir"
      description="Catat daftar kehadiran musyawarah warga"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Nama Peserta</label>
          <Input
            type="text"
            required
            placeholder="Nama warga"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Peran / Jabatan</label>
          <Input
            type="text"
            value={form.role_or_title}
            onChange={(e) => setForm({ ...form, role_or_title: e.target.value })}
          />
        </div>
        <div className="flex justify-end gap-2 pt-3 border-t border-[#d2d2d7]">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Menyimpan...' : 'Simpan Peserta'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
