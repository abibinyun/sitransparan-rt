import React, { useState } from 'react';
import { EventItem, RSVPStatus } from '../types/event';
import { useSaveEventRSVP } from '../services/event';
import { useResidents } from '../services/resident';

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

  if (!isOpen || !event) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResidentId) return;

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
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Konfirmasi Partisipasi Warga: {event.title}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Pilih Warga</label>
            <select
              required
              value={selectedResidentId}
              onChange={(e) => setSelectedResidentId(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
            >
              <option value="">-- Pilih Warga --</option>
              {residents.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.full_name} ({r.nik})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Status Kehadiran</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as RSVPStatus)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
            >
              <option value="attending">Hadir (Attending)</option>
              <option value="maybe">Ragu-ragu (Maybe)</option>
              <option value="absent">Tidak Hadir (Absent)</option>
            </select>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saveRSVP.isPending || !selectedResidentId}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50"
            >
              {saveRSVP.isPending ? 'Menyimpan...' : 'Simpan Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
