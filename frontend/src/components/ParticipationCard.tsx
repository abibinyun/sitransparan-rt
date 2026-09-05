import React, { useEffect, useState } from 'react';
import { BellRing, Award, QrCode } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { getBadge, ParticipationBadgeInfo } from '../services/push';

/**
 * Kartu partisipasi warga:
 * - Warga login: badge partisipasi aktif dari data nyata + status push notifikasi.
 * - Warga publik: ajakan partisipasi warga & scan QR rumah.
 */
export const ParticipationCard: React.FC = () => {
  const { user } = useAuthStore();
  const [badge, setBadge] = useState<ParticipationBadgeInfo | null>(null);
  const [pushState, setPushState] = useState<'idle' | 'enabled' | 'unsupported'>('idle');
  const [badgeError, setBadgeError] = useState(false);

  useEffect(() => {
    if (user) {
      getBadge()
        .then((b) => {
          if (b) setBadge(b);
          else setBadgeError(true);
        })
        .catch(() => setBadgeError(true));
    }
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushState('unsupported');
      return;
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      setPushState('enabled');
    }
  }, [user]);

  return (
    <section aria-label="Partisipasi Warga" className="civic-card p-5 sm:p-6 space-y-3">
      <h2 className="flex items-center gap-2 text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-800">
        <Award className="h-4 w-4 text-emerald-600" /> Partisipasi Warga
      </h2>

      {user ? (
        <>
          {badge ? (
            <div className="mt-3">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800">
                <Award className="w-3.5 h-3.5" /> {badge.level}
              </p>
              <p className="mt-2 text-xs text-slate-500 tabular-nums">
                {badge.reactions_given} apresiasi · {badge.votes_cast} suara polling
              </p>
            </div>
          ) : badgeError ? (
            <p className="mt-3 text-xs text-slate-500">
              Warga Aktif · <button onClick={() => getBadge().then(setBadge).catch(()=>{})} className="underline font-semibold text-emerald-700">Refresh badge</button>
            </p>
          ) : (
            <p className="mt-3 text-xs text-slate-400">Memuat status partisipasi…</p>
          )}

          <div className="mt-4 border-t border-slate-100 pt-3">
            {pushState === 'enabled' ? (
              <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                <BellRing className="w-3.5 h-3.5" /> Notifikasi perangkat aktif
              </p>
            ) : pushState === 'unsupported' ? (
              <p className="text-xs text-slate-400">Peramban tidak mendukung notifikasi web.</p>
            ) : null}
          </div>
        </>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-slate-600 leading-relaxed">
            Setiap warga berhak mengikuti polling musyawarah dan keterbukaan lingkungan.
          </p>
          <div className="rounded-lg bg-emerald-50/80 border border-emerald-200 p-3 text-xs text-emerald-950 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-emerald-800">
              <QrCode className="w-4 h-4" /> Akses 1 Rumah = 1 Token
            </div>
            <p className="text-[11px] text-emerald-800 leading-snug">
              Scan stiker QR di pintu rumah Anda untuk langsung ikut voting musyawarah dan kirim usulan tanpa kata sandi.
            </p>
          </div>
        </div>
      )}
    </section>
  );
};
