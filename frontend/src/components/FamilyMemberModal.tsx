import React, { useState } from 'react';
import { CreateFamilyMemberPayload } from '../types/resident';
import { useAddFamilyMember } from '../services/resident';
import { dateOnlyToISO } from '../utils/date';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select } from './ui/select';

interface FamilyMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  residentId: string;
}

export const FamilyMemberModal: React.FC<FamilyMemberModalProps> = ({
  isOpen,
  onClose,
  residentId,
}) => {
  const addFamilyMemberMutation = useAddFamilyMember();

  const [formData, setFormData] = useState<CreateFamilyMemberPayload>({
    full_name: '',
    nik: '',
    relation: 'Anak',
    birth_date: '',
    gender: 'Laki-laki',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addFamilyMemberMutation.mutateAsync({
      residentId,
      payload: { ...formData, birth_date: dateOnlyToISO(formData.birth_date) },
    });
    setFormData({
      full_name: '',
      nik: '',
      relation: 'Anak',
      birth_date: '',
      gender: 'Laki-laki',
    });
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Tambah Anggota Keluarga"
      description="Tambahkan susunan anggota keluarga dalam Kartu Keluarga"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="famName">Nama Lengkap</Label>
          <Input
            id="famName"
            type="text"
            required
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="famNik">NIK</Label>
          <Input
            id="famNik"
            type="text"
            required
            maxLength={16}
            value={formData.nik}
            onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="famRelation">Hubungan Keluarga</Label>
            <Select
              id="famRelation"
              value={formData.relation}
              onChange={(e) => setFormData({ ...formData, relation: e.target.value })}
            >
              <option value="Istri">Istri</option>
              <option value="Suami">Suami</option>
              <option value="Anak">Anak</option>
              <option value="Orang Tua">Orang Tua</option>
              <option value="Lainnya">Lainnya</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="famGender">Jenis Kelamin</Label>
            <Select
              id="famGender"
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
            >
              <option value="Laki-laki">Laki-laki</option>
              <option value="Perempuan">Perempuan</option>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="famBirthDate">Tanggal Lahir</Label>
          <Input
            id="famBirthDate"
            type="date"
            value={formData.birth_date}
            onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" disabled={addFamilyMemberMutation.isPending}>
            {addFamilyMemberMutation.isPending ? 'Menyimpan...' : 'Tambah Anggota'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
