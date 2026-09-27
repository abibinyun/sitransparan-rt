import React, { useState } from 'react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { WasteCategory } from '../../services/wasteBank';

interface WasteCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: WasteCategory | null;
  onSubmit: (data: any) => Promise<void>;
  isSubmitting?: boolean;
}

export const WasteCategoryModal: React.FC<WasteCategoryModalProps> = ({
  isOpen,
  onClose,
  initialData,
  onSubmit,
  isSubmitting,
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [unit, setUnit] = useState(initialData?.unit || 'kg');
  const [pricePerUnit, setPricePerUnit] = useState<number>(initialData?.price_per_unit || 3000);
  const [residentSharePct, setResidentSharePct] = useState<number>(initialData?.resident_share_pct || 80);
  const [karangTarunaSharePct, setKarangTarunaSharePct] = useState<number>(initialData?.karang_taruna_share_pct || 20);
  const [isActive, setIsActive] = useState<boolean>(initialData ? initialData.is_active : true);

  const isEditing = Boolean(initialData?.id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      unit,
      price_per_unit: Number(pricePerUnit),
      resident_share_pct: Number(residentSharePct),
      karang_taruna_share_pct: Number(karangTarunaSharePct),
      is_active: isActive,
    });
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Ubah Kategori Sampah' : 'Tambah Kategori Sampah'}
      description="Atur harga per unit dan persentase bagi hasil"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Nama Kategori</label>
          <Input
            type="text"
            required
            placeholder="cth: Kardus / Box Bekas"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Satuan</label>
            <Input
              type="text"
              required
              placeholder="kg / liter / pcs"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Harga per Satuan (Rp)</label>
            <Input
              type="number"
              required
              min="0"
              value={pricePerUnit}
              onChange={(e) => setPricePerUnit(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Bagi Hasil Warga (%)</label>
            <Input
              type="number"
              required
              min="0"
              max="100"
              value={residentSharePct}
              onChange={(e) => {
                const val = Math.min(100, Math.max(0, Number(e.target.value)));
                setResidentSharePct(val);
                setKarangTarunaSharePct(100 - val);
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Bagian Karang Taruna (%)</label>
            <Input
              type="number"
              required
              min="0"
              max="100"
              value={karangTarunaSharePct}
              onChange={(e) => {
                const val = Math.min(100, Math.max(0, Number(e.target.value)));
                setKarangTarunaSharePct(val);
                setResidentSharePct(100 - val);
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Checkbox
            id="category_is_active"
            checked={isActive}
            onCheckedChange={(checked) => setIsActive(Boolean(checked))}
          />
          <label htmlFor="category_is_active" className="text-xs text-[#1d1d1f] font-medium cursor-pointer select-none">
            Status Kategori Aktif (Dapat dipilih saat penimbangan)
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
            {isSubmitting ? 'Menyimpan...' : 'Simpan Kategori'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
