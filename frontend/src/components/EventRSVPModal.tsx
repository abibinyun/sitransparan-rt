import React, { useState } from 'react';
import { EventItem, RSVPStatus } from '../types/event';
import { useSaveEventRSVP } from '../services/event';
import { useResidents } from '../services/resident';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select } from './ui/select';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  event: EventItem | null;
}

export const EventRSVPModal: React.FC<Props> = ({ isOpen, onClose, event }) => {
  const saveRSVP = useSaveEventRSVP();
  const { data: residentsRes } = useResidents();

  const residents = Array.isArray(residentsRes)
    ? residentsRes
    : residentsRes?.data || [];

  const [selectedResidentId, setSelectedResidentId] = useState('');
  const [status, setStatus] = useState<RSVPStatus>('attending');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResidentId || !event) return;

    saveRSVP.mutate(
      {
        eventId: event.id,
        payload: {
          resident_id: selectedResidentId,
          status,
        },
      },
      {
        onSuccess: () => {
          setSelectedResidentId('');
          setStatus('attending');
          onClose();
        },
      }
    );
  };

  return (
    <Dialog
      isOpen={isOpen && !!event}
      onClose={onClose}
      title={`Konfirmasi Partisipasi Warga: ${event?.title || ''}`}
      description="Catat konfirmasi kehadiran warga pada kegiatan RT"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="rsvpResident">Pilih Warga</Label>
          <Select
            id="rsvpResident"
            required
            value={selectedResidentId}
            onChange={(e) => setSelectedResidentId(e.target.value)}
          >
            <option value="">-- Pilih Warga --</option>
            {residents.map((r) => (
              <option key={r.id} value={r.id}>
                {r.full_name} ({r.nik})
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="rsvpStatus">Status Kehadiran</Label>
          <Select
            id="rsvpStatus"
            value={status}
            onChange={(e) => setStatus(e.target.value as RSVPStatus)}
          >
            <option value="attending">Hadir (Attending)</option>
            <option value="maybe">Ragu-ragu (Maybe)</option>
            <option value="absent">Tidak Hadir (Absent)</option>
          </Select>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="submit"
            disabled={saveRSVP.isPending || !selectedResidentId}
          >
            {saveRSVP.isPending ? 'Menyimpan...' : 'Simpan Status'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
