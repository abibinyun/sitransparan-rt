import React, { useState, useEffect } from 'react';
import { SimpleDialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select } from '../ui/select';
import { Fund, FundType } from '../../types/financial';

interface FundModalProps {
  isOpen: boolean;
  onClose: () => void;
  fund: Fund | null;
  userList: any[];
  onSave: (payload: {
    id?: string;
    name: string;
    type: FundType;
    description?: string;
    pic_user_id?: string | null;
  }) => Promise<void>;
  isSubmitting?: boolean;
}

export const FundModal: React.FC<FundModalProps> = ({
  isOpen,
  onClose,
  fund,
  userList,
  onSave,
  isSubmitting,
}) => {
  const [fundName, setFundName] = useState('');
  const [fundType, setFundType] = useState<FundType>('operational');
  const [fundDesc, setFundDesc] = useState('');
  const [fundPicUserId, setFundPicUserId] = useState<string>('');

  useEffect(() => {
    if (fund) {
      setFundName(fund.name);
      setFundType(fund.type);
      setFundDesc(fund.description || '');
      setFundPicUserId(fund.pic_user_id || '');
    } else {
      setFundName('');
      setFundType('operational');
      setFundDesc('');
      setFundPicUserId('');
    }
  }, [fund, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fundName.trim()) return;
    await onSave({
      id: fund?.id,
      name: fundName.trim(),
      type: fundType,
      description: fundDesc.trim() || undefined,
      pic_user_id: fundPicUserId ? fundPicUserId : null,
    });
  };

  return (
    <SimpleDialog
      isOpen={isOpen}
      onClose={onClose}
      title={fund ? 'Edit Kantong Kas' : 'Tambah Kantong Kas Baru'}
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="fundName">Nama Kantong Kas *</Label>
          <Input
            id="fundName"
            type="text"
            placeholder="Contoh: Kas Operasional, Kas Sosial, Kas Pemuda, Kas Pembangunan"
            value={fundName}
            onChange={(e) => setFundName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fundPic">Penanggung Jawab (PIC Kantong Kas)</Label>
          <Select
            id="fundPic"
            value={fundPicUserId}
            onChange={(e) => setFundPicUserId(e.target.value)}
          >
            <option value="">-- Pengurus RT Utama (Default) --</option>
            {userList.map((u: any) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email}) - {u.role_name || u.role}
              </option>
            ))}
          </Select>
          <p className="text-[11px] text-[#707070]">
            PIC yang ditunjuk memiliki wewenang mencatat transaksi mutasi pemasukan/pengeluaran pada kantong kas ini.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fundType">Tipe / Peruntukan Alokasi *</Label>
          <Select
            id="fundType"
            value={fundType}
            onChange={(e) => setFundType(e.target.value as FundType)}
          >
            <option value="operational">Operasional Rutin RT</option>
            <option value="social">Sosial, Duka & Sumbangan</option>
            <option value="youth">Kepemudaan & Olahraga</option>
            <option value="infrastructure">Infrastruktur & Pembangunan</option>
            <option value="other">Lainnya</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fundDesc">Deskripsi (Opsional)</Label>
          <Input
            id="fundDesc"
            type="text"
            placeholder="Keterangan alokasi penggunaan dana kas ini"
            value={fundDesc}
            onChange={(e) => setFundDesc(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Menyimpan...' : fund ? 'Simpan Perubahan' : 'Simpan Kantong Kas'}
          </Button>
        </div>
      </form>
    </SimpleDialog>
  );
};
