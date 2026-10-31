import React, { useState } from 'react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { useReportHouseVacancyMutation } from '../../services/safety';
import { validateVacancyPayload } from '../../utils/safetyValidation';

interface HouseVacancyModalProps {
  isOpen: boolean;
  onClose: () => void;
  houseId: string;
}

export const HouseVacancyModal: React.FC<HouseVacancyModalProps> = ({ isOpen, onClose, houseId }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [contact, setContact] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  const reportMutation = useReportHouseVacancyMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateVacancyPayload(startDate, endDate, contact);
    if (err) {
      setFormError(err);
      return;
    }

    try {
      await reportMutation.mutateAsync({
        house_id: houseId,
        start_date: startDate,
        end_date: endDate,
        emergency_contact: contact,
        notes,
      });
      onClose();
      setStartDate('');
      setEndDate('');
      setContact('');
      setNotes('');
      setFormError('');
    } catch (e: any) {
      setFormError(e.response?.data?.error || 'Gagal mengirim laporan rumah kosong');
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Lapor Rumah Mudik / Kosong" className="sm:max-w-[420px]">
      <p className="text-xs text-slate-500 mb-3">
        Data jadwal rumah kosong dijaga <strong>sangat rahasia (confidential)</strong> dan hanya dapat diakses oleh petugas ronda siskamling serta pengurus RT untuk prioritas patroli lingkungan.
      </p>

      {formError && (
        <div className="p-3 text-xs bg-rose-50 text-rose-700 rounded-lg border border-rose-200 mb-3">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-semibold text-slate-700">Tanggal Mulai</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 text-xs"
              required
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-700">Tanggal Pulang</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 text-xs"
              required
            />
          </div>
        </div>

        <div>
          <Label className="text-xs font-semibold text-slate-700">Nomor Kontak Darurat (WhatsApp)</Label>
          <Input
            placeholder="081234567890"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className="mt-1 text-xs"
            required
          />
        </div>

        <div>
          <Label className="text-xs font-semibold text-slate-700">Catatan Khusus Keamanan</Label>
          <Textarea
            placeholder="Contoh: Lampu teras otomatis menyala, kunci dititipkan ke rumah Pak RT..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 text-xs resize-none"
            rows={3}
          />
        </div>

        <div className="pt-2 flex gap-2 justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="submit"
            disabled={reportMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
          >
            {reportMutation.isPending ? 'Menyimpan...' : 'Kirim Laporan Rahasia'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
