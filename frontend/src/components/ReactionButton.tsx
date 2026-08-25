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
  const { data: summary } = useReactionSummary(targetType, targetId);
  const react = useReact(targetType, targetId);

  const handle = (type: ReactionType) => {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    // Klik ulang reaksi yang sama = tarik reaksi
    react.mutate(summary?.mine === type ? null : type);
  };

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
            className={`inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold px-2 sm:px-2.5 py-1.5 rounded-lg border ${
              active
                ? 'bg-emerald-700 text-white border-emerald-700'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900'
            } disabled:opacity-50`}
          >
            <Icon className="w-3.5 h-3.5" aria-hidden />
            <span className="hidden sm:inline">{label}</span>
            {count > 0 && <span className="tabular-nums">{count}</span>}
          </button>
        );
      })}
      {!user && (
        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-400">
          <LogIn className="w-3 h-3" /> masuk untuk bereaksi
        </span>
      )}
    </div>
  );
};
