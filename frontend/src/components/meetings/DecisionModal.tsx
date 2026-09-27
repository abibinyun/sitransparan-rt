import React from 'react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';

interface DecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: {
    decision_text: string;
    category: string;
  };
  setForm: (form: any) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  isSubmitting?: boolean;
}

export const DecisionModal: React.FC<DecisionModalProps> = ({
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
      title="Tambah Keputusan Bersama"
      description="Catat kesepakatan dan hasil resmi musyawarah"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Isi Keputusan / Kesepakatan</label>
          <Textarea
            required
            rows={3}
            placeholder="Contoh: Iuran sampah disepakati naik menjadi Rp 25.000 mulai bulan depan."
            value={form.decision_text}
            onChange={(e) => setForm({ ...form, decision_text: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Kategori Keputusan</label>
          <Input
            type="text"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
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
            {isSubmitting ? 'Menyimpan...' : 'Simpan Keputusan'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
