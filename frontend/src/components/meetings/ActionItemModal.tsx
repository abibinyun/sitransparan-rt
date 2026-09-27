import React from 'react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Meeting } from '../../types/meeting';

interface ActionItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingActionItem: any | null;
  meetings: Meeting[];
  form: {
    meeting_id: string;
    task: string;
    assignee_name: string;
    due_date: string;
    status: string;
    notes: string;
  };
  setForm: (form: any) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  isSubmitting?: boolean;
}

export const ActionItemModal: React.FC<ActionItemModalProps> = ({
  isOpen,
  onClose,
  editingActionItem,
  meetings,
  form,
  setForm,
  onSubmit,
  isSubmitting,
}) => {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={editingActionItem ? 'Edit Tugas Tindak Lanjut' : 'Tambah Tugas Tindak Lanjut'}
      description="Tugaskan warga atau pengurus untuk menindaklanjuti hasil rapat"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Pilih Rapat Terkait</label>
          <Select
            required
            value={form.meeting_id || (meetings.length > 0 ? meetings[0].id : '')}
            onValueChange={(val) => setForm({ ...form, meeting_id: val })}
          >
            {meetings.map((m: Meeting) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Deskripsi Tugas</label>
          <Input
            type="text"
            required
            placeholder="Contoh: Beli cat dan kuas untuk pos ronda"
            value={form.task}
            onChange={(e) => setForm({ ...form, task: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Penanggung Jawab (PIC)</label>
          <Input
            type="text"
            required
            placeholder="Nama warga penanggung jawab"
            value={form.assignee_name}
            onChange={(e) => setForm({ ...form, assignee_name: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Target Selesai (Due Date)</label>
          <Input
            type="date"
            value={form.due_date}
            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Status Pengerjaan</label>
          <Select
            value={form.status}
            onValueChange={(val) => setForm({ ...form, status: val })}
          >
            <option value="pending">Tertunda (Pending)</option>
            <option value="in_progress">Sedang Dikerjakan (In Progress)</option>
            <option value="completed">Selesai (Completed)</option>
            <option value="cancelled">Dibatalkan (Cancelled)</option>
          </Select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Catatan Tambahan</label>
          <Input
            type="text"
            placeholder="Keterangan tambahan..."
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
              : editingActionItem
              ? 'Simpan Perubahan'
              : 'Simpan Tugas'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
