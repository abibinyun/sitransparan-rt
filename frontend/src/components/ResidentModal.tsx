import React, { useState, useEffect } from 'react';
import { Resident, CreateResidentPayload } from '../types/resident';
import { useCreateResident, useUpdateResident } from '../services/resident';

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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resident) {
      await updateMutation.mutateAsync({ id: resident.id, payload: formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
    onClose();
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {resident ? 'Edit Data Warga' : 'Tambah Data Warga'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">NIK</label>
              <input
                type="text"
                required
                maxLength={16}
                value={formData.nik}
                onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">No KK</label>
              <input
                type="text"
                required
                maxLength={16}
                value={formData.kk_number}
                onChange={(e) => setFormData({ ...formData, kk_number: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Nama Lengkap</label>
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Jenis Kelamin</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Tempat Lahir</label>
              <input
                type="text"
                value={formData.birth_place}
                onChange={(e) => setFormData({ ...formData, birth_place: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Tanggal Lahir</label>
              <input
                type="date"
                value={formData.birth_date}
                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">RT/RW</label>
              <input
                type="text"
                value={formData.rt_rw}
                onChange={(e) => setFormData({ ...formData, rt_rw: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">No Telepon</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Alamat</label>
            <textarea
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_head_of_family"
              checked={formData.is_head_of_family}
              onChange={(e) => setFormData({ ...formData, is_head_of_family: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="is_head_of_family" className="text-sm font-medium text-gray-700">
              Status Kepala Keluarga
            </label>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isPending ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
