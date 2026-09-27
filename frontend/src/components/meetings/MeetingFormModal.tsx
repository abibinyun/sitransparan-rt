import React from 'react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select } from '../ui/select';
import { Meeting } from '../../types/meeting';

interface MeetingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingMeeting: Meeting | null;
  form: {
    title: string;
    agenda: string;
    meeting_date: string;
    location: string;
    meeting_type: string;
    visibility: 'public' | 'internal' | 'confidential';
    status: string;
    notes: string;
  };
  setForm: (form: any) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  isSubmitting?: boolean;
}

export const MeetingFormModal: React.FC<MeetingFormModalProps> = ({
  isOpen,
  onClose,
  editingMeeting,
  form,
  setForm,
  onSubmit,
  isSubmitting,
}) => {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={editingMeeting ? 'Edit Arsip Rapat' : 'Catat Rapat Baru'}
      description="Isi rincian informasi musyawarah atau rapat warga"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Judul Rapat</label>
          <Input
            type="text"
            required
            placeholder="Contoh: Rapat Pleno Pemilihan Ketua RT 003"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Agenda & Pembahasan</label>
          <Textarea
            required
            rows={3}
            placeholder="Rincian poin yang dibahas..."
            value={form.agenda}
            onChange={(e) => setForm({ ...form, agenda: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Waktu Rapat</label>
            <Input
              type="datetime-local"
              required
              value={form.meeting_date}
              onChange={(e) => setForm({ ...form, meeting_date: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Lokasi</label>
            <Input
              type="text"
              required
              placeholder="Contoh: Balai Warga / Pos Ronda"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Jenis Rapat</label>
            <Select
              value={form.meeting_type}
              onValueChange={(val) => setForm({ ...form, meeting_type: val })}
            >
              <option value="rutin">Rapat Rutin Bulanan</option>
              <option value="koordinasi">Rapat Koordinasi Pengurus</option>
              <option value="pleno">Musyawarah Warga (Pleno)</option>
              <option value="darurat">Rapat Darurat / Luar Biasa</option>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Visibilitas Notulen</label>
            <Select
              value={form.visibility}
              onValueChange={(val) => setForm({ ...form, visibility: val as any })}
            >
              <option value="public">Publik (Dapat Dibaca Seluruh Warga)</option>
              <option value="internal">Internal (Hanya Pengurus RT)</option>
              <option value="confidential">Rahasia (Pengurus Tertentu)</option>
            </Select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Catatan Tambahan (Opsional)</label>
          <Textarea
            rows={2}
            placeholder="Catatan panitia atau logistik..."
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
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
          >
            {isSubmitting
              ? 'Menyimpan...'
              : editingMeeting
              ? 'Simpan Perubahan'
              : 'Simpan Notulen'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
