import React from 'react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Select } from '../ui/select';
import { InventoryBorrowing } from '../../services/inventory';

interface InventoryReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBorrowing: InventoryBorrowing | null;
  returnCondition: string;
  setReturnCondition: (val: string) => void;
  returnNotes: string;
  setReturnNotes: (val: string) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  isSubmitting?: boolean;
}

export const InventoryReturnModal: React.FC<InventoryReturnModalProps> = ({
  isOpen,
  onClose,
  selectedBorrowing,
  returnCondition,
  setReturnCondition,
  returnNotes,
  setReturnNotes,
  onSubmit,
  isSubmitting,
}) => {
  if (!selectedBorrowing) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Proses Pengembalian Barang"
      description="Verifikasi kondisi barang saat dikembalikan ke inventaris"
    >
      <form onSubmit={onSubmit} className="space-y-4 mt-2">
        <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1 border border-slate-100">
          <div>
            <span className="text-slate-500">Peminjam:</span>{' '}
            <span className="font-semibold text-slate-900">{selectedBorrowing.borrower_name}</span>
          </div>
          <div>
            <span className="text-slate-500">Barang:</span>{' '}
            <span className="font-semibold text-slate-900">
              {selectedBorrowing.item_name} ({selectedBorrowing.quantity} {selectedBorrowing.unit})
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Kondisi Barang Saat Kembali *
          </label>
          <Select
            value={returnCondition}
            onValueChange={(val) => setReturnCondition(val)}
          >
            <option value="good">Baik / Utuh</option>
            <option value="fair">Cukup (Sedikit Kotor/Gores)</option>
            <option value="damaged">Rusak</option>
            <option value="lost">Hilang</option>
          </Select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Catatan Pengurus (Opsional)
          </label>
          <Textarea
            rows={2}
            value={returnNotes}
            onChange={(e) => setReturnNotes(e.target.value)}
            placeholder="Keterangan tambahan jika ada kerusakan atau denda"
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
            className="apple-btn-primary"
          >
            {isSubmitting ? 'Memproses...' : 'Selesaikan Pengembalian'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
