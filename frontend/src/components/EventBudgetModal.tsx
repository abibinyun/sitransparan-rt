import React, { useState, useEffect } from 'react';
import { EventItem, EventBudget } from '../types/event';
import { useSaveEventBudget } from '../services/event';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;
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
    <Dialog
      isOpen={isOpen && !!event}
      onClose={onClose}
      title={`Rincian Anggaran: ${event?.title || ''}`}
      description="Kelola rancangan anggaran biaya (RAB) kegiatan"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="budgetDesc">Keterangan Anggaran</Label>
          <Input
            id="budgetDesc"
            type="text"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Contoh: Konsumsi & Perlengkapan"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="estCost">Estimasi Biaya (Rp)</Label>
          <Input
            id="estCost"
            type="number"
            min="0"
            required
            value={estimatedCost}
            onChange={(e) => setEstimatedCost(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="actCost">Realisasi Biaya (Rp)</Label>
          <Input
            id="actCost"
            type="number"
            min="0"
            required
            value={actualCost}
            onChange={(e) => setActualCost(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="0"
          />
        </div>

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-600">Estimasi:</span>
            <span className="font-semibold text-slate-900">Rp {estNum.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Realisasi:</span>
            <span className="font-semibold text-slate-900">Rp {actNum.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-1">
            <span className="text-slate-600">Selisih:</span>
            <span className={`font-bold ${diff > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              Rp {diff.toLocaleString('id-ID')} ({diff > 0 ? 'Over budget' : 'Under budget'})
            </span>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" disabled={saveBudget.isPending}>
            {saveBudget.isPending ? 'Menyimpan...' : 'Simpan Anggaran'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
