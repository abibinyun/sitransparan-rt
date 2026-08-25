import React, { useEffect, useState } from 'react';
import { BellRing, Award } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { enablePushNotifications, getBadge, ParticipationBadgeInfo } from '../services/push';

/**
 * Kartu partisipasi (Fase 4): badge gamifikasi dari data nyata + tombol
 * consent notifikasi. Hanya tampil untuk warga yang sedang login.
 */
export const ParticipationCard: React.FC = () => {
  const { user } = useAuthStore();
  const [badge, setBadge] = useState<ParticipationBadgeInfo | null>(null);
  const [pushState, setPushState] = useState<'idle' | 'enabling' | 'enabled' | 'unsupported'>('idle');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!user) return;
    getBadge().then(setBadge);
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushState('unsupported');
      return;
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      setPushState('enabled');
    }
  }, [user]);

  if (!user) return null;

  const enable = async () => {
    setPushState('enabling');
    const res = await enablePushNotifications();
    if (res.ok) {
      setPushState('enabled');
      setNote('');
    } else {
      setPushState('idle');
      setNote(res.reason || 'Gagal mengaktifkan notifikasi.');
    }
  };

  return (
    <section aria-label="Partisipasi Anda" className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
        <Award className="h-4 w-4 text-emerald-700" /> Partisipasi Anda
      </h2>

      {badge ? (
        <div className="mt-3">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800">
            <Award className="w-3.5 h-3.5" /> {badge.level}
          </p>
          <p className="mt-2 text-xs text-slate-500 tabular-nums">
            {badge.reactions_given} apresiasi · {badge.votes_cast} suara polling
          </p>
        </div>
      ) : (
        <p className="mt-3 text-xs text-slate-400">Memuat…</p>
      )}

      <div className="mt-4 border-t border-slate-100 pt-3">
        {pushState === 'enabled' ? (
          <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
            <BellRing className="w-3.5 h-3.5" /> Notifikasi aktif
          </p>
        ) : pushState === 'unsupported' ? (
          <p className="text-xs text-slate-400">Peramban tidak mendukung notifikasi.</p>
        ) : (
          <>
            <button
              onClick={enable}
              disabled={pushState === 'enabling'}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 border border-slate-300 hover:border-slate-400 hover:text-slate-900 px-3 py-1.5 rounded-lg disabled:opacity-50"
            >
              <BellRing className="w-3.5 h-3.5" />
              {pushState === 'enabling' ? 'Mengaktifkan…' : 'Aktifkan Notifikasi'}
            </button>
            {note && <p className="mt-1.5 text-[11px] text-rose-600">{note}</p>}
          </>
        )}
      </div>
    </section>
  );
};
