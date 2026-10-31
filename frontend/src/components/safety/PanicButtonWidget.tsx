import React, { useState } from 'react';
import { AlertTriangle, Siren, Check } from 'lucide-react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { useAuthStore } from '../../store/useAuthStore';
import { useTriggerPanicMutation, useActiveEmergenciesQuery, useResolveEmergencyMutation } from '../../services/safety';
import { validatePanicPayload } from '../../utils/safetyValidation';

export const PanicButtonWidget: React.FC = () => {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [alertType, setAlertType] = useState<'medical' | 'fire' | 'crime' | 'other'>('medical');
  const [description, setDescription] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [formError, setFormError] = useState('');

  const { data: emergencies } = useActiveEmergenciesQuery();
  const triggerPanicMutation = useTriggerPanicMutation();
  const resolveMutation = useResolveEmergencyMutation();

  const activeList = emergencies?.data || [];
  const userRole = String(user?.role || '').toLowerCase();
  const isAdmin = userRole === 'admin_rt' || userRole === 'superadmin' || userRole === 'operator';

  const handleTrigger = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validatePanicPayload(alertType, description);
    if (err) {
      setFormError(err);
      return;
    }

    try {
      await triggerPanicMutation.mutateAsync({
        reporter_name: user?.name || 'Warga',
        house_number: houseNumber || 'Rumah Warga',
        alert_type: alertType,
        description,
      });
      setIsOpen(false);
      setDescription('');
      setFormError('');
    } catch (e: any) {
      setFormError(e.response?.data?.error || 'Gagal memicu alarm');
    }
  };

  return (
    <div className="space-y-3">
      {/* Alert banner jika ada darurat aktif */}
      {activeList.map((a) => (
        <div
          key={a.id}
          className="p-4 rounded-xl bg-rose-50 border-2 border-rose-500 flex items-center justify-between gap-3 animate-pulse"
        >
          <div className="flex items-center gap-3">
            <Siren className="w-6 h-6 text-rose-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-rose-800 uppercase tracking-wide">
                ALARM DARURAT: {a.alert_type} ({a.house_number || 'Warga'})
              </p>
              <p className="text-sm font-semibold text-rose-950 mt-0.5">{a.description}</p>
              <p className="text-[11px] text-rose-700 mt-1">Pelapor: {a.reporter_name}</p>
            </div>
          </div>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => resolveMutation.mutate(a.id)}
              className="border-rose-300 text-rose-700 hover:bg-rose-100"
            >
              <Check className="w-4 h-4 mr-1" />
              Selesai
            </Button>
          )}
        </div>
      ))}

      {/* Tombol Utama Panic */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-sm flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" /> Tombol Darurat Lingkungan
          </h3>
          <p className="text-xs text-rose-100 mt-0.5">Picu sirine dan notifikasi warga saat butuh bantuan darurat</p>
        </div>
        <Button
          type="button"
          onClick={() => setIsOpen(true)}
          className="bg-white text-rose-700 hover:bg-rose-50 font-bold text-xs h-9 px-4 rounded-full shadow"
        >
          Picu Alarm
        </Button>
      </div>

      {/* Modal Dialog Form Darurat */}
      <Dialog isOpen={isOpen} onClose={() => setIsOpen(false)} title="Picu Bantuan Darurat" className="sm:max-w-[420px]">
        {formError && (
          <div className="p-3 text-xs bg-rose-50 text-rose-700 rounded-lg border border-rose-200 mb-3">
            {formError}
          </div>
        )}

        <form onSubmit={handleTrigger} className="space-y-4">
          <div>
            <Label className="text-xs font-semibold text-slate-700">Jenis Keadaan Darurat</Label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              {[
                { id: 'medical', label: '🚑 Medis / Ambulans' },
                { id: 'fire', label: '🔥 Kebakaran' },
                { id: 'crime', label: '🚨 Kejahatan / Maling' },
                { id: 'other', label: '⚠️ Bencana / Lainnya' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAlertType(item.id as any)}
                  className={`py-2 px-3 text-xs font-medium rounded-xl border text-left transition-all ${
                    alertType === item.id
                      ? 'border-rose-600 bg-rose-50 text-rose-900 font-bold'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700">Nomor / Blok Rumah</Label>
            <Input
              placeholder="Contoh: Blok B-04"
              value={houseNumber}
              onChange={(e) => setHouseNumber(e.target.value)}
              className="mt-1 text-xs"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700">Keterangan Bantuan yang Dibutuhkan</Label>
            <Textarea
              placeholder="Jelaskan kondisi singkat..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 text-xs resize-none"
              rows={3}
              required
            />
          </div>

          <div className="pt-2 flex gap-2 justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              disabled={triggerPanicMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {triggerPanicMutation.isPending ? 'Mengirim...' : 'KIRIM ALARM SEKARANG'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
