import React, { useState } from 'react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { WasteCategory } from '../../services/wasteBank';
import { useResidents } from '../../services/resident';
import { useHouses } from '../../services/house';

interface WasteDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: WasteCategory[];
  onSubmit: (data: any) => Promise<void>;
  isSubmitting?: boolean;
}

export const WasteDepositModal: React.FC<WasteDepositModalProps> = ({
  isOpen,
  onClose,
  categories,
  onSubmit,
  isSubmitting,
}) => {
  const [familyHeadName, setFamilyHeadName] = useState('');
  const [kkNumber, setKkNumber] = useState('');
  const [rtNumber, setRtNumber] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [, setSelectedResidentId] = useState('');
  const [selectedHouseId, setSelectedHouseId] = useState('');
  const [items, setItems] = useState<{ category_id: string; quantity: number }[]>([
    { category_id: categories[0]?.id || '', quantity: 1 },
  ]);

  // Load master data residents & houses
  const { data: residentsData } = useResidents({ limit: 100 });
  const { data: housesData } = useHouses({ limit: 100 });

  const residentsList = residentsData?.data || [];
  const housesList = housesData?.data || [];

  const handleSelectHouse = (houseId: string) => {
    setSelectedHouseId(houseId);
    if (!houseId) return;
    const foundHouse = housesList.find((h) => h.id === houseId);
    if (foundHouse) {
      setHouseNumber(foundHouse.block_number);
      if (foundHouse.head_resident) {
        setSelectedResidentId(foundHouse.head_resident.id);
        setFamilyHeadName(foundHouse.head_resident.full_name || '');
        setKkNumber(foundHouse.head_resident.kk_number || '');
        if (foundHouse.head_resident.rt_rw) {
          const parts = foundHouse.head_resident.rt_rw.split('/');
          setRtNumber(parts[0]?.replace(/\D/g, '') || '');
        }
      }
    }
  };

  const handleSelectResident = (residentId: string) => {
    setSelectedResidentId(residentId);
    if (!residentId) return;
    const found = residentsList.find((r) => r.id === residentId);
    if (found) {
      setFamilyHeadName(found.full_name || '');
      setKkNumber(found.kk_number || '');
      if (found.rt_rw) {
        const parts = found.rt_rw.split('/');
        setRtNumber(parts[0]?.replace(/\D/g, '') || '');
      }
      if (!houseNumber) {
        setHouseNumber(found.address || '');
      }
    }
  };

  const addItem = () => {
    if (categories.length > 0) {
      setItems([...items, { category_id: categories[0].id, quantity: 1 }]);
    }
  };

  const updateItem = (index: number, field: string, val: any) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: val };
    setItems(next);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      family_head_name: familyHeadName,
      kk_number: kkNumber,
      rt_number: rtNumber,
      house_number: houseNumber,
      items: items.map((i) => ({ category_id: i.category_id, quantity: Number(i.quantity) })),
    });
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Catat Setoran Bank Sampah"
      description="Input berat dan jenis sampah terpilah warga"
      className="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Quick select via Rumah / Warga Terdaftar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Pilih dari Master Rumah (Otomatis Isi KK):
            </label>
            <Select
              value={selectedHouseId}
              onValueChange={handleSelectHouse}
            >
              <option value="">-- Pilih No. Rumah / Blok --</option>
              {housesList.map((h) => (
                <option key={h.id} value={h.id}>
                  Blok {h.block_number} {h.head_resident ? `(${h.head_resident.full_name})` : ''}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Atau Pilih dari Daftar Kepala Keluarga:
            </label>
            <Select
              onValueChange={handleSelectResident}
            >
              <option value="">-- Pilih Warga Terdaftar --</option>
              {residentsList.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.full_name} (KK: {r.kk_number})
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Nama Kepala Keluarga *</label>
            <Input
              type="text"
              required
              placeholder="Nama kepala keluarga"
              value={familyHeadName}
              onChange={(e) => setFamilyHeadName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Nomor Kartu Keluarga (KK) *</label>
            <Input
              type="text"
              required
              placeholder="16 digit nomor KK"
              value={kkNumber}
              onChange={(e) => setKkNumber(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">No. Rumah / Blok</label>
            <Input
              type="text"
              placeholder="Contoh: A1/12"
              value={houseNumber}
              onChange={(e) => setHouseNumber(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Nomor RT</label>
            <Input
              type="text"
              placeholder="Contoh: 003"
              value={rtNumber}
              onChange={(e) => setRtNumber(e.target.value)}
            />
          </div>
        </div>

        {/* Dynamic Items */}
        <div className="space-y-3 pt-2 border-t border-[#d2d2d7]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#1d1d1f]">Rincian Jenis &amp; Bobot Sampah</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addItem}
              className="text-xs h-7 gap-1 text-[#0066cc]"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah Baris
            </Button>
          </div>

          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="flex-1">
                  <Select
                    value={item.category_id}
                    onValueChange={(val) => updateItem(idx, 'category_id', val)}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (Rp {c.price_per_unit.toLocaleString('id-ID')}/{c.unit})
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="w-28">
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    placeholder="Bobot (kg)"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                  />
                </div>
                {items.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(idx)}
                    className="h-9 w-9 p-0 text-rose-600 hover:text-rose-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
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
            {isSubmitting ? 'Menyimpan...' : 'Simpan Setoran'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
