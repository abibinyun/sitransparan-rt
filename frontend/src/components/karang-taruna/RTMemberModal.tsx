import React from 'react';
import { SimpleDialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select } from '../ui/select';
import { SearchableResidentSelect } from '../ui/SearchableResidentSelect';
import { Trash2 } from 'lucide-react';
import { RTMember } from '../../services/rt_structure';

interface RTMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingMember: RTMember | null;
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
  rtSectionsList: string[];
  isAddingSection: boolean;
  setIsAddingSection: (val: boolean) => void;
  newSectionName: string;
  setNewSectionName: (val: string) => void;
  onAddNewSection: () => void;
  onDeleteSection: (name: string) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  isSubmitting?: boolean;
}

export const RTMemberModal: React.FC<RTMemberModalProps> = ({
  isOpen,
  onClose,
  editingMember,
  form,
  setForm,
  allSelectableResidents,
  rtSectionsList,
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
      title={editingMember ? 'Edit Data Pengurus RT' : 'Tambah / Tetapkan Pengurus RT'}
      description="Tetapkan warga ke dalam jabatan struktur kepengurusan RT/RW resmi."
      className="max-w-2xl"
      preventOutsideClose={true}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {!editingMember && (
          <div className="space-y-1.5">
            <Label htmlFor="rtResidentSelect">Pilih Warga *</Label>
            <SearchableResidentSelect
              id="rtResidentSelect"
              required
              value={form.resident_id}
              onChange={(val) => setForm({ ...form, resident_id: val })}
              residents={allSelectableResidents}
              placeholder="Cari nama atau NIK warga..."
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="rtRole">Jabatan Pokok *</Label>
            <Select
              id="rtRole"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="ketua">Ketua RT</option>
              <option value="wakil">Wakil Ketua RT</option>
              <option value="sekretaris">Sekretaris</option>
              <option value="bendahara">Bendahara</option>
              <option value="seksi">Koordinator Seksi</option>
              <option value="penasihat">Penasihat / Tokoh Masyarakat</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="rtSection">Bidang / Seksi</Label>
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
                  id="rtSection"
                  value={form.section}
                  onChange={(e) => setForm({ ...form, section: e.target.value })}
                  className="flex-1 text-xs"
                >
                  <option value="">-- Tanpa Seksi (Pengurus Inti) --</option>
                  {rtSectionsList.map((s) => (
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
                    className="h-9 w-9 p-0 text-rose-600 hover:text-rose-800"
                    title="Hapus seksi ini dari daftar pilihan"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  id="newSectionName"
                  placeholder="Ketik nama seksi baru (misal: Seksi Keamanan)"
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  className="text-xs h-9"
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="rtCustomTitle">Gelar / Sebutan Jabatan (Opsional)</Label>
            <Input
              id="rtCustomTitle"
              placeholder="Contoh: Ketua RT 03, Koordinator Pos Ronda"
              value={form.custom_title}
              onChange={(e) => setForm({ ...form, custom_title: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rtPhone">No. WhatsApp Resmi (Opsional)</Label>
            <Input
              id="rtPhone"
              placeholder="Contoh: 081234567890"
              value={form.phone_override}
              onChange={(e) => setForm({ ...form, phone_override: e.target.value })}
            />
          </div>
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
