import React from 'react';
import { SimpleDialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select } from '../ui/select';
import { SearchableResidentSelect } from '../ui/SearchableResidentSelect';
import { Trash2 } from 'lucide-react';
import { KarangTarunaMember } from '../../types/karang_taruna';

interface KTMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingMember: KarangTarunaMember | null;
  currentPeriodName?: string;
  form: {
    resident_id: string;
    role: string;
    section: string;
    custom_title: string;
    phone_override: string;
    status: string;
  };
  setForm: (form: any) => void;
  allSelectableResidents: any[];
  rolesList: string[];
  sectionsList: string[];
  isAddingSection: boolean;
  setIsAddingSection: (val: boolean) => void;
  newSectionName: string;
  setNewSectionName: (val: string) => void;
  onAddNewSection: () => void;
  onDeleteSection: (name: string) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  isSubmitting?: boolean;
}

export const KTMemberModal: React.FC<KTMemberModalProps> = ({
  isOpen,
  onClose,
  editingMember,
  currentPeriodName,
  form,
  setForm,
  allSelectableResidents,
  rolesList,
  sectionsList,
  isAddingSection,
  setIsAddingSection,
  newSectionName,
  setNewSectionName,
  onAddNewSection,
  onDeleteSection,
  onSubmit,
  isSubmitting,
}) => {
  return (
    <SimpleDialog
      isOpen={isOpen}
      onClose={onClose}
      title={editingMember ? 'Edit Data Pengurus' : 'Tambah Pengurus / Anggota Pemuda'}
      description={`Menugaskan warga ke dalam struktur kepengurusan ${currentPeriodName || ''}`}
      className="max-w-3xl"
      preventOutsideClose={true}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {!editingMember && (
          <div className="space-y-2">
            <Label htmlFor="residentSelect">Pilih Warga *</Label>
            <SearchableResidentSelect
              id="residentSelect"
              required
              value={form.resident_id}
              onChange={(val) => setForm({ ...form, resident_id: val })}
              residents={allSelectableResidents}
              placeholder="Cari nama atau NIK warga..."
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="memberRole">Jabatan / Peran</Label>
            <Select
              id="memberRole"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {rolesList.map((r) => (
                <option key={r} value={r}>
                  {r.toUpperCase()}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="memberSection">Seksi / Bidang</Label>
              {!isAddingSection ? (
                <button
                  type="button"
                  onClick={() => setIsAddingSection(true)}
                  className="text-[11px] text-[#0071e3] hover:underline font-semibold"
                >
                  + Buat Seksi Baru
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingSection(false)}
                  className="text-[11px] text-[#707070] hover:underline"
                >
                  Batal
                </button>
              )}
            </div>

            {!isAddingSection ? (
              <div className="flex items-center gap-1.5">
                <Select
                  id="memberSection"
                  value={form.section}
                  onChange={(e) => setForm({ ...form, section: e.target.value })}
                  className="flex-1 text-xs"
                >
                  <option value="">-- Tanpa Seksi (Inti) --</option>
                  {sectionsList.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
                {form.section && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteSection(form.section)}
                    className="h-9 px-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50"
                    title="Hapus seksi ini dari daftar master"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Input
                  placeholder="Nama seksi baru (mis: Olahraga, E-Sport)..."
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  className="text-xs h-9"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      onAddNewSection();
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={onAddNewSection}
                  className="h-9 text-xs apple-btn-primary shrink-0"
                >
                  Simpan
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="customTitle">Nama Jabatan Khusus (Opsional)</Label>
          <Input
            id="customTitle"
            placeholder="Contoh: Koordinator Futsal & E-Sport"
            value={form.custom_title}
            onChange={(e) => setForm({ ...form, custom_title: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phoneOverride">Nomor Kontak Pemuda (Opsional)</Label>
          <Input
            id="phoneOverride"
            placeholder="0812xxxx"
            value={form.phone_override}
            onChange={(e) => setForm({ ...form, phone_override: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="memberStatus">Status Keanggotaan</Label>
          <Select
            id="memberStatus"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option value="aktif">Aktif</option>
            <option value="demisioner">Demisioner</option>
            <option value="nonaktif">Non-aktif</option>
          </Select>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-[#d2d2d7]">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting} className="apple-btn-primary">
            {editingMember ? 'Simpan Perubahan' : 'Tetapkan Pengurus'}
          </Button>
        </div>
      </form>
    </SimpleDialog>
  );
};
