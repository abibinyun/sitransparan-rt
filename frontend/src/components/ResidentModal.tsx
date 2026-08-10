import React, { useState, useEffect } from 'react';
import { Resident, CreateResidentPayload } from '../types/resident';
import { useCreateResident, useUpdateResident } from '../services/resident';
import { dateOnlyToISO } from '../utils/date';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select } from './ui/select';

interface ResidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  resident?: Resident | null;
}

export const ResidentModal: React.FC<ResidentModalProps> = ({ isOpen, onClose, resident }) => {
  const createMutation = useCreateResident();
  const updateMutation = useUpdateResident();

  const [formData, setFormData] = useState<CreateResidentPayload>({
    nik: '',
    kk_number: '',
    full_name: '',
    gender: 'Laki-laki',
    birth_place: '',
    birth_date: '',
    address: '',
    rt_rw: '',
    phone: '',
    is_head_of_family: false,
  });

  useEffect(() => {
    if (resident) {
      setFormData({
        nik: resident.nik || '',
        kk_number: resident.kk_number || '',
        full_name: resident.full_name || '',
        gender: resident.gender || 'Laki-laki',
        birth_place: resident.birth_place || '',
        birth_date: resident.birth_date ? resident.birth_date.split('T')[0] : '',
        address: resident.address || '',
        rt_rw: resident.rt_rw || '',
        phone: resident.phone || '',
        is_head_of_family: resident.is_head_of_family || false,
      });
    } else {
      setFormData({
        nik: '',
        kk_number: '',
        full_name: '',
        gender: 'Laki-laki',
        birth_place: '',
        birth_date: '',
        address: '',
        rt_rw: '',
        phone: '',
        is_head_of_family: false,
      });
    }
  }, [resident, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData, birth_date: dateOnlyToISO(formData.birth_date) };
    if (resident) {
      await updateMutation.mutateAsync({ id: resident.id, payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    onClose();
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={resident ? 'Edit Data Warga' : 'Tambah Data Warga'}
      description="Kelola profil kependudukan warga RT"
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nik">NIK</Label>
            <Input
              id="nik"
              type="text"
              required
              maxLength={16}
              value={formData.nik}
              onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kk_number">No KK</Label>
            <Input
              id="kk_number"
              type="text"
              required
              maxLength={16}
              value={formData.kk_number}
              onChange={(e) => setFormData({ ...formData, kk_number: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nama Lengkap</Label>
            <Input
              id="full_name"
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gender">Jenis Kelamin</Label>
            <Select
              id="gender"
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
            >
              <option value="Laki-laki">Laki-laki</option>
              <option value="Perempuan">Perempuan</option>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="birth_place">Tempat Lahir</Label>
            <Input
              id="birth_place"
              type="text"
              value={formData.birth_place}
              onChange={(e) => setFormData({ ...formData, birth_place: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="birth_date">Tanggal Lahir</Label>
            <Input
              id="birth_date"
              type="date"
              value={formData.birth_date}
              onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="address">Alamat</Label>
            <Input
              id="address"
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rt_rw">RT/RW</Label>
            <Input
              id="rt_rw"
              type="text"
              value={formData.rt_rw}
              onChange={(e) => setFormData({ ...formData, rt_rw: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone">No Telepon</Label>
            <Input
              id="phone"
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div className="flex items-center space-x-2 pt-6">
            <input
              type="checkbox"
              id="is_head_of_family"
              checked={formData.is_head_of_family}
              onChange={(e) => setFormData({ ...formData, is_head_of_family: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <Label htmlFor="is_head_of_family" className="cursor-pointer select-none">
              Kepala Keluarga
            </Label>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Menyimpan...' : 'Simpan Data'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
