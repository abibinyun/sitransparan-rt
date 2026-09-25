import React, { useState, useEffect } from 'react';
import { Resident, CreateResidentPayload } from '../types/resident';
import { useCreateResident, useUpdateResident, useUploadResidentDoc } from '../services/resident';
import { useHouses, useCreateHouse, useUpdateHouse } from '../services/house';
import { dateOnlyToISO } from '../utils/date';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { UploadCloud, FileText, Home } from 'lucide-react';
import { getFileUrl } from '../utils/file';

interface ResidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  resident?: Resident | null;
}

export const ResidentModal: React.FC<ResidentModalProps> = ({ isOpen, onClose, resident }) => {
  const createMutation = useCreateResident();
  const updateMutation = useUpdateResident();
  const uploadDocMutation = useUploadResidentDoc();
  const createHouseMutation = useCreateHouse();
  const updateHouseMutation = useUpdateHouse();
  const [uploadingKtp, setUploadingKtp] = useState(false);
  const [uploadingKk, setUploadingKk] = useState(false);

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
    house_id: undefined,
    is_head_of_family: false,
    ktp_url: '',
    kk_url: '',
  });

  const [isCreatingNewHouse, setIsCreatingNewHouse] = useState(false);
  const [newBlockNumber, setNewBlockNumber] = useState('');
  const [newHouseAddress, setNewHouseAddress] = useState('');
  const [creatingHouseError, setCreatingHouseError] = useState<string | null>(null);

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
        house_id: resident.house_id || undefined,
        is_head_of_family: resident.is_head_of_family || false,
        ktp_url: resident.ktp_url || '',
        kk_url: resident.kk_url || '',
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
        house_id: undefined,
        is_head_of_family: false,
        ktp_url: '',
        kk_url: '',
      });
    }
    setIsCreatingNewHouse(false);
    setNewBlockNumber('');
    setNewHouseAddress('');
    setCreatingHouseError(null);
  }, [resident, isOpen]);

  const { data: housesData } = useHouses({ limit: 100 });
  const housesList = housesData?.data || [];
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSelectHouse = (houseId: string) => {
    if (!houseId) {
      setFormData((prev) => ({ ...prev, house_id: undefined }));
      return;
    }
    const foundHouse = housesList.find(h => h.id === houseId);
    if (foundHouse) {
      const fullAddress = foundHouse.address 
        ? `${foundHouse.block_number}, ${foundHouse.address}` 
        : foundHouse.block_number;
      setFormData((prev) => ({
        ...prev,
        house_id: houseId,
        address: prev.address || fullAddress,
      }));
    } else {
      setFormData((prev) => ({ ...prev, house_id: houseId }));
    }
  };

  const handleCreateInlineHouse = async () => {
    if (!newBlockNumber.trim()) {
      setCreatingHouseError('Nama / Keterangan Rumah wajib diisi');
      return;
    }
    setCreatingHouseError(null);
    try {
      const created = await createHouseMutation.mutateAsync({
        block_number: newBlockNumber.trim(),
        address: newHouseAddress.trim() || undefined,
        head_resident_id: resident?.id || undefined,
      });
      const fullAddress = created.address 
        ? `${created.block_number}, ${created.address}` 
        : created.block_number;
      setFormData((prev) => ({
        ...prev,
        house_id: created.id,
        address: prev.address || fullAddress,
      }));
      setIsCreatingNewHouse(false);
      setNewBlockNumber('');
      setNewHouseAddress('');
    } catch (err: any) {
      setCreatingHouseError(err.response?.data?.error || 'Gagal menambahkan rumah');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    try {
      const payload = { ...formData, birth_date: dateOnlyToISO(formData.birth_date) };
      let savedResident: Resident;
      if (resident) {
        savedResident = await updateMutation.mutateAsync({ id: resident.id, payload });
      } else {
        savedResident = await createMutation.mutateAsync(payload);
      }

      // Jika warga ini adalah Kepala Keluarga dan memilih rumah, pastikan rumah mencatat head_resident_id
      const targetHouseId = formData.house_id;
      const residentIdToSync = savedResident?.id || resident?.id;
      if (targetHouseId && formData.is_head_of_family && residentIdToSync) {
        const currentHouse = housesList.find((h) => h.id === targetHouseId);
        try {
          await updateHouseMutation.mutateAsync({
            id: targetHouseId,
            block_number: currentHouse?.block_number || '',
            address: currentHouse?.address,
            head_resident_id: residentIdToSync,
          });
        } catch {
          // Ignore background sync error
        }
      }

      onClose();
    } catch (err: any) {
      setSubmitError(err.response?.data?.error || err.message || 'Gagal menyimpan data warga');
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={resident ? 'Edit Data Warga' : 'Tambah Data Warga'}
      description="Kelola profil kependudukan warga RT"
      className="max-w-4xl"
      preventOutsideClose={true}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {submitError && (
          <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
            {submitError}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nik">NIK (Opsional)</Label>
            <Input
              id="nik"
              type="text"
              maxLength={16}
              value={formData.nik}
              onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
              placeholder="Nomor Induk Kependudukan 16 digit"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kk_number">No KK (Opsional)</Label>
            <Input
              id="kk_number"
              type="text"
              maxLength={16}
              value={formData.kk_number}
              onChange={(e) => setFormData({ ...formData, kk_number: e.target.value })}
              placeholder="Nomor Kartu Keluarga 16 digit"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nama Lengkap *</Label>
            <Input
              id="full_name"
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Nama lengkap sesuai KTP"
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

        {/* Selector Rumah / Blok Warga & Quick Add */}
        <div className="p-3.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="house_select" className="text-xs font-semibold text-[#1d1d1f] flex items-center gap-1.5">
              <Home className="w-4 h-4 text-[#0071e3]" />
              Tautkan ke Data Rumah / Blok Fisik
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsCreatingNewHouse(!isCreatingNewHouse);
                setCreatingHouseError(null);
              }}
              className="text-xs h-7 px-2.5 bg-white border-[#d2d2d7] text-[#0071e3] hover:text-[#0077ed]"
            >
              {isCreatingNewHouse ? 'Batal Tambah' : '+ Rumah Baru'}
            </Button>
          </div>

          {!isCreatingNewHouse ? (
            <div className="space-y-1">
              <Select
                id="house_select"
                value={formData.house_id || ''}
                onValueChange={(val) => handleSelectHouse(val)}
              >
                <option value="">-- Pilih Rumah / Blok Terdaftar (Opsional) --</option>
                {housesList.map((h) => (
                  <option key={h.id} value={h.id}>
                    Blok/No: {h.block_number} {h.address ? `(${h.address})` : ''}
                  </option>
                ))}
              </Select>
              <p className="text-[11px] text-[#86868b]">
                Menautkan rumah akan menyinkronkan akses stiker QR dan otomatis mengisi alamat.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-white border border-[#0071e3]/30 rounded-lg space-y-2.5">
              <div className="text-xs font-medium text-[#1d1d1f]">
                Tambah Rumah Baru Cepat
              </div>
              {creatingHouseError && (
                <div className="p-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded">
                  {creatingHouseError}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="new_block_number" className="text-[11px] text-[#6e6e73]">
                    Atas Nama / Nomor Rumah *
                  </Label>
                  <Input
                    id="new_block_number"
                    value={newBlockNumber}
                    onChange={(e) => setNewBlockNumber(e.target.value)}
                    placeholder="Contoh: Bpk. Bambang Pamungkas / No. 38"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor="new_house_address" className="text-[11px] text-[#6e6e73]">
                    Alamat / Keterangan Lokasi
                  </Label>
                  <Input
                    id="new_house_address"
                    value={newHouseAddress}
                    onChange={(e) => setNewHouseAddress(e.target.value)}
                    placeholder="Contoh: Jl. Melati Raya RT 05 / Gg. Langgar"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCreateInlineHouse}
                  disabled={createHouseMutation.isPending}
                  className="h-7 text-xs px-3"
                >
                  {createHouseMutation.isPending ? 'Menyimpan...' : 'Simpan & Tautkan'}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="address">Alamat *</Label>
            <Input
              id="address"
              type="text"
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Contoh: Jl. Melati No. 12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rt_rw">RT/RW *</Label>
            <Input
              id="rt_rw"
              type="text"
              required
              value={formData.rt_rw}
              onChange={(e) => setFormData({ ...formData, rt_rw: e.target.value })}
              placeholder="Contoh: 003/005"
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
            <Checkbox
              id="is_head_of_family"
              checked={formData.is_head_of_family}
              onCheckedChange={(checked) => setFormData({ ...formData, is_head_of_family: Boolean(checked) })}
            />
            <Label htmlFor="is_head_of_family" className="cursor-pointer select-none">
              Kepala Keluarga
            </Label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <div className="space-y-2">
            <Label htmlFor="ktpInput">Foto KTP Warga</Label>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-3 text-center hover:border-indigo-400 transition-colors bg-slate-50/50">
              <input
                id="ktpInput"
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                disabled={uploadingKtp}
                onChange={async (e) => {
                  if (e.target.files && e.target.files[0]) {
                    setUploadingKtp(true);
                    try {
                      const res = await uploadDocMutation.mutateAsync({
                        file: e.target.files[0],
                        type: 'ktp',
                      });
                      setFormData((prev) => ({ ...prev, ktp_url: res.url }));
                    } catch {
                      // ignore
                    } finally {
                      setUploadingKtp(false);
                    }
                  }
                }}
              />
              <label htmlFor="ktpInput" className="cursor-pointer flex flex-col items-center justify-center gap-1">
                {formData.ktp_url ? (
                  <div className="flex flex-col items-center gap-2 w-full">
                    {formData.ktp_url.match(/\.(jpeg|jpg|png|webp|gif)/i) ? (
                      <img
                        src={getFileUrl(formData.ktp_url)}
                        alt="KTP"
                        className="h-28 w-auto max-w-full object-contain rounded-lg border border-slate-200"
                      />
                    ) : (
                      <div className="flex items-center gap-2 text-emerald-600 font-semibold text-xs truncate max-w-full">
                        <FileText className="w-4 h-4 shrink-0" />
                        <span className="truncate">Dokumen KTP Terunggah</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-xs">
                      <a
                        href={getFileUrl(formData.ktp_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:underline font-semibold"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Buka Foto
                      </a>
                      <span className="text-slate-300">|</span>
                      <span className="text-slate-500 font-medium">Klik untuk ganti</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="w-6 h-6 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-700">
                      {uploadingKtp ? 'Mengunggah...' : 'Pilih Foto KTP'}
                    </span>
                  </>
                )}
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="kkInput">Foto Kartu Keluarga (KK)</Label>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-3 text-center hover:border-indigo-400 transition-colors bg-slate-50/50">
              <input
                id="kkInput"
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                disabled={uploadingKk}
                onChange={async (e) => {
                  if (e.target.files && e.target.files[0]) {
                    setUploadingKk(true);
                    try {
                      const res = await uploadDocMutation.mutateAsync({
                        file: e.target.files[0],
                        type: 'kk',
                      });
                      setFormData((prev) => ({ ...prev, kk_url: res.url }));
                    } catch {
                      // ignore
                    } finally {
                      setUploadingKk(false);
                    }
                  }
                }}
              />
              <label htmlFor="kkInput" className="cursor-pointer flex flex-col items-center justify-center gap-1">
                {formData.kk_url ? (
                  <div className="flex flex-col items-center gap-2 w-full">
                    {formData.kk_url.match(/\.(jpeg|jpg|png|webp|gif)/i) ? (
                      <img
                        src={getFileUrl(formData.kk_url)}
                        alt="KK"
                        className="h-28 w-auto max-w-full object-contain rounded-lg border border-slate-200"
                      />
                    ) : (
                      <div className="flex items-center gap-2 text-emerald-600 font-semibold text-xs truncate max-w-full">
                        <FileText className="w-4 h-4 shrink-0" />
                        <span className="truncate">Dokumen KK Terunggah</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-xs">
                      <a
                        href={getFileUrl(formData.kk_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:underline font-semibold"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Buka Foto
                      </a>
                      <span className="text-slate-300">|</span>
                      <span className="text-slate-500 font-medium">Klik untuk ganti</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="w-6 h-6 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-700">
                      {uploadingKk ? 'Mengunggah...' : 'Pilih Foto KK'}
                    </span>
                  </>
                )}
              </label>
            </div>
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
