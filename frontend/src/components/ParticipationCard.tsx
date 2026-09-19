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
    <section aria-label="Partisipasi Warga" className="apple-card p-5 sm:p-6 space-y-3">
      <h2 className="flex items-center gap-2 text-xs sm:text-sm font-semibold uppercase tracking-wider text-[#1d1d1f]">
        <Award className="h-4 w-4 text-[#0071e3]" /> Partisipasi Warga
      </h2>

      {user ? (
        <>
          {badge ? (
            <div className="mt-3">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-[#f4f8fb] border border-[#d2d2d7] px-3 py-1 text-xs font-semibold text-[#0066cc]">
                <Award className="w-3.5 h-3.5 text-[#0071e3]" /> {badge.level}
              </p>
              <p className="mt-2 text-xs text-[#707070] tabular-nums">
                {badge.reactions_given} apresiasi · {badge.votes_cast} suara polling
              </p>
            </div>
          ) : badgeError ? (
            <p className="mt-3 text-xs text-[#707070]">
              Warga Aktif · <button onClick={() => getBadge().then(setBadge).catch(()=>{})} className="underline font-medium text-[#0066cc]">Refresh badge</button>
            </p>
          ) : (
            <p className="mt-3 text-xs text-[#707070]">Memuat status partisipasi…</p>
          )}

          <div className="mt-4 border-t border-[#d2d2d7] pt-3">
            {pushState === 'enabled' ? (
              <p className="text-xs font-medium text-[#0066cc] flex items-center gap-1.5">
                <BellRing className="w-3.5 h-3.5 text-[#0071e3]" /> Notifikasi perangkat aktif
              </p>
            ) : pushState === 'unsupported' ? (
              <p className="text-xs text-[#707070]">Peramban tidak mendukung notifikasi web.</p>
            ) : null}
          </div>
        </>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-[#474747] leading-relaxed">
            Setiap warga berhak mengikuti polling musyawarah dan keterbukaan lingkungan.
          </p>
          <div className="rounded-lg bg-[#f4f8fb] border border-[#d2d2d7] p-3 text-xs text-[#1d1d1f] space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-[#0066cc]">
              <QrCode className="w-4 h-4 text-[#0071e3]" /> Akses 1 Rumah = 1 Token
            </div>
            <p className="text-[11px] text-[#474747] leading-snug">
              Scan stiker QR di pintu rumah Anda untuk langsung ikut voting musyawarah dan kirim usulan tanpa kata sandi.
            </p>
          </div>
        </div>
      )}
    </section>
  );
};
