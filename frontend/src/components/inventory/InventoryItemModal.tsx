import React from 'react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { InventoryItem } from '../../services/inventory';

interface InventoryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItem: InventoryItem | null;
  form: {
    name: string;
    item_code: string;
    category: string;
    quantity: number;
    unit: string;
    condition: string;
    location: string;
    description: string;
    is_borrowable: boolean;
  };
  setForm: (form: any) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  isSubmitting?: boolean;
}

export const InventoryItemModal: React.FC<InventoryItemModalProps> = ({
  isOpen,
  onClose,
  selectedItem,
  form,
  setForm,
  onSubmit,
  isSubmitting,
}) => {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={selectedItem ? 'Edit Barang Inventaris' : 'Tambah Barang Inventaris'}
      description="Kelola data aset dan inventaris warga RT"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
            Nama Barang *
          </label>
          <Input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Contoh: Kursi Lipat Chitose, Tenda 4x6"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
              Kode Barang (Opsional)
            </label>
            <Input
              type="text"
              value={form.item_code}
              onChange={(e) => setForm({ ...form, item_code: e.target.value })}
              placeholder="INV-001"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
              Kategori *
            </label>
            <Select
              value={form.category}
              onValueChange={(val) => setForm({ ...form, category: val })}
            >
              <option value="Peralatan Tenda & Kursi">Peralatan Tenda & Kursi</option>
              <option value="Sound & Elektronik">Sound & Elektronik</option>
              <option value="Kebersihan & Kerja Bakti">Kebersihan & Kerja Bakti</option>
              <option value="Olahraga & Kesenian">Olahraga & Kesenian</option>
              <option value="Perlengkapan Umum">Perlengkapan Umum</option>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
              Jumlah Total *
            </label>
            <Input
              type="number"
              min="1"
              required
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
              Satuan *
            </label>
            <Input
              type="text"
              required
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              placeholder="Unit, Pcs, Set"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
              Kondisi Awal
            </label>
            <Select
              value={form.condition}
              onValueChange={(val) => setForm({ ...form, condition: val })}
            >
              <option value="good">Baik</option>
              <option value="fair">Cukup</option>
              <option value="damaged">Rusak</option>
              <option value="lost">Hilang</option>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
              Lokasi Penyimpanan
            </label>
            <Input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Gudang RT / Balai Warga"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
            Deskripsi / Spesifikasi
          </label>
          <Textarea
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Keterangan warna, ukuran, atau merk"
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Checkbox
            id="is_borrowable"
            checked={form.is_borrowable}
            onCheckedChange={(checked) => setForm({ ...form, is_borrowable: Boolean(checked) })}
          />
          <label htmlFor="is_borrowable" className="text-xs font-medium text-[#1d1d1f] cursor-pointer select-none">
            Dapat dipinjamkan kepada warga umum
          </label>
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
            {isSubmitting ? 'Menyimpan...' : 'Simpan Barang'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
