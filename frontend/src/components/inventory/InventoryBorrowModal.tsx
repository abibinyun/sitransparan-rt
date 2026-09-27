import React from 'react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { InventoryItem } from '../../services/inventory';

interface InventoryBorrowModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetItem: InventoryItem | null;
  form: {
    borrower_name: string;
    borrower_phone: string;
    quantity: number;
    purpose: string;
    borrow_date: string;
    expected_return_date: string;
    notes: string;
  };
  setForm: (form: any) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  isSubmitting?: boolean;
}

export const InventoryBorrowModal: React.FC<InventoryBorrowModalProps> = ({
  isOpen,
  onClose,
  targetItem,
  form,
  setForm,
  onSubmit,
  isSubmitting,
}) => {
  if (!targetItem) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Catat Peminjaman Barang"
      description={`${targetItem.name} (Tersedia: ${targetItem.available_quantity} ${targetItem.unit})`}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
            Nama Warga / Peminjam *
          </label>
          <Input
            type="text"
            required
            value={form.borrower_name}
            onChange={(e) => setForm({ ...form, borrower_name: e.target.value })}
            placeholder="Nama warga atau perwakilan"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
              No. WhatsApp / HP
            </label>
            <Input
              type="text"
              value={form.borrower_phone}
              onChange={(e) => setForm({ ...form, borrower_phone: e.target.value })}
              placeholder="0812xxxx"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
              Jumlah Pinjam *
            </label>
            <Input
              type="number"
              min="1"
              max={targetItem.available_quantity}
              required
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
            Keperluan / Acara
          </label>
          <Input
            type="text"
            value={form.purpose}
            onChange={(e) => setForm({ ...form, purpose: e.target.value })}
            placeholder="Contoh: Acara Hajatan / Rapat RT / Kerja Bakti"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
              Tanggal Pinjam
            </label>
            <Input
              type="date"
              value={form.borrow_date}
              onChange={(e) => setForm({ ...form, borrow_date: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
              Rencana Kembali
            </label>
            <Input
              type="date"
              value={form.expected_return_date}
              onChange={(e) => setForm({ ...form, expected_return_date: e.target.value })}
            />
          </div>
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
            className="apple-btn-primary"
          >
            {isSubmitting ? 'Menyimpan...' : 'Konfirmasi Peminjaman'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
