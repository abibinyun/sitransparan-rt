import React from 'react';
import { ThumbsUp, Heart, Sparkles, LogIn } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useReactionSummary, useReact, ReactionType } from '../services/social';

const OPTIONS: Array<{ type: ReactionType; label: string; Icon: React.ElementType }> = [
  { type: 'support', label: 'Dukung', Icon: ThumbsUp },
  { type: 'like', label: 'Suka', Icon: Heart },
  { type: 'applause', label: 'Keren', Icon: Sparkles },
];

interface ReactionButtonProps {
  targetType: 'announcement' | 'event' | 'meeting';
  targetId: string;
}

/**
 * Reaksi ringan 1-warga-1-reaksi (identitas wajib — konsep portal §7.1).
 * Pengunjung anonim diarahkan ke halaman masuk saat mencoba bereaksi.
 */
export const ReactionButton: React.FC<ReactionButtonProps> = ({ targetType, targetId }) => {
  const { user } = useAuthStore();
  const { data: summary, isError, error, refetch } = useReactionSummary(targetType, targetId);
  const react = useReact(targetType, targetId);

  const handle = (type: ReactionType) => {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    react.mutate(summary?.mine === type ? null : type, {
      onError: () => refetch(),
    });
  };

  if (isError) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-rose-500">
        Gagal memuat reaksi: {(error as Error)?.message || 'coba lagi'}{' '}
        <button onClick={() => refetch()} className="underline font-semibold">Muat ulang</button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5" role="group" aria-label="Beri apresiasi">
      {OPTIONS.map(({ type, label, Icon }) => {
        const active = summary?.mine === type;
        const count = summary?.counts?.[type] ?? 0;
        return (
          <button
            key={type}
            onClick={() => handle(type)}
            disabled={react.isPending}
            aria-pressed={active}
            aria-label={`${label}${count > 0 ? ` (${count})` : ''}`}
            title={user ? label : 'Masuk untuk bereaksi'}
            className={`inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-full transition-all ${
              active
                ? 'bg-[#663af3] text-white shadow-sm ring-1 ring-[rgba(186,215,247,0.3)]'
                : 'bg-[rgba(186,214,247,0.06)] text-[#d1e4fa] border border-[rgba(186,215,247,0.14)] hover:bg-[rgba(186,214,247,0.12)] hover:border-[rgba(186,215,247,0.24)]'
            } disabled:opacity-50`}
          >
            <Icon className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-[#b6d9fc]'}`} aria-hidden />
            <span className="hidden sm:inline">{label}</span>
            {count > 0 && <span className="tabular-nums font-bold">{count}</span>}
          </button>
        );
      })}
      {!user && (
        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-[#9da7ba]">
          <LogIn className="w-3 h-3 text-[#b6d9fc]" /> masuk untuk bereaksi
        </span>
      )}
    </div>
  );
};
