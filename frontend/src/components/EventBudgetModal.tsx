import React, { useState, useEffect } from 'react';
import { EventItem, EventBudget } from '../types/event';
import { useSaveEventBudget } from '../services/event';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  event: EventItem | null;
}

export const EventBudgetModal: React.FC<Props> = ({ isOpen, onClose, event }) => {
  const saveBudget = useSaveEventBudget();
  const [description, setDescription] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<number | ''>('');
  const [actualCost, setActualCost] = useState<number | ''>('');

  useEffect(() => {
    if (event?.budget) {
      setDescription(event.budget.description || '');
      setEstimatedCost(event.budget.estimated_cost ?? 0);
      setActualCost(event.budget.actual_cost ?? 0);
    } else {
      setDescription('');
      setEstimatedCost('');
      setActualCost('');
    }
  }, [event]);

  if (!isOpen || !event) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Partial<EventBudget> = {
      description,
      estimated_cost: Number(estimatedCost) || 0,
      actual_cost: Number(actualCost) || 0,
    };

    saveBudget.mutate(
      { eventId: event.id, payload },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  const estNum = Number(estimatedCost) || 0;
  const actNum = Number(actualCost) || 0;
  const diff = actNum - estNum;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Rincian Anggaran: {event.title}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Keterangan Anggaran</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
              placeholder="Contoh: Konsumsi & Perlangkapan"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Estimasi Biaya (Rp)</label>
            <input
              type="number"
              min="0"
              required
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value === '' ? '' : Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Realisasi Biaya (Rp)</label>
            <input
              type="number"
              min="0"
              required
              value={actualCost}
              onChange={(e) => setActualCost(e.target.value === '' ? '' : Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
              placeholder="0"
            />
          </div>

          <div className="p-3 bg-gray-50 rounded-md border text-sm space-y-1">
            <div className="flex justify-between">
              <span>Estimasi:</span>
              <span className="font-semibold">Rp {estNum.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between">
              <span>Realisasi:</span>
              <span className="font-semibold">Rp {actNum.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between pt-1 border-t">
              <span>Selisih (Realisasi - Estimasi):</span>
              <span className={`font-bold ${diff > 0 ? 'text-red-600' : 'text-green-600'}`}>
                Rp {diff.toLocaleString('id-ID')}
              </span>
            </div>
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
              disabled={saveBudget.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50"
            >
              {saveBudget.isPending ? 'Menyimpan...' : 'Simpan Anggaran'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
