import React from 'react';
import { BarChart3, Check } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useOpenPolls, useVotePoll } from '../services/social';

/**
 * Polling 1-klik: 1 warga 1 suara (unique constraint di backend).
 * Hasil agregat terlihat semua; suara individual lain tidak pernah tampil.
 */
export const PollWidget: React.FC = () => {
  const { user } = useAuthStore();
  const { data: polls, isLoading, isError, error, refetch } = useOpenPolls();
  const vote = useVotePoll();
  const [voteError, setVoteError] = React.useState('');

  if (isLoading) {
    return <div className="h-32 animate-pulse rounded-xl bg-slate-100" aria-label="Memuat polling" />;
  }
  if (isError) {
    return (
      <section className="rounded-xl border border-rose-200 bg-rose-50 p-6">
        <p className="text-xs text-rose-700">Gagal memuat polling: {(error as Error)?.message || 'coba lagi'}</p>
        <button onClick={() => refetch()} className="mt-2 text-xs font-semibold underline text-rose-700">Muat ulang</button>
      </section>
    );
  }
  if (!polls || polls.length === 0) return null;

  return (
    <section aria-label="Polling warga" className="apple-card p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-[#d2d2d7] pb-2.5">
        <h2 className="flex items-center gap-2 text-xs sm:text-sm font-semibold uppercase tracking-wider text-[#1d1d1f]">
          <BarChart3 className="h-4 w-4 text-[#0071e3]" /> Jajak Pendapat / Polling Warga
        </h2>
        <span className="apple-badge">
          1 Warga 1 Suara
        </span>
      </div>
      <div className="mt-4 space-y-5">
        {polls.map((poll) => {
          const votes = poll.votes ?? [];
          const total = poll.total_votes ?? votes.reduce((a, b) => a + b, 0);
          return (
            <div key={poll.id}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[#1d1d1f] leading-snug">{poll.question}</p>
                {poll.status !== 'open' && (
                  <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#f5f5f7] text-[#707070] border border-[#d2d2d7]">
                    Ditutup
                  </span>
                )}
              </div>
              <ul className="mt-2 space-y-1.5">
                {poll.options.map((opt, i) => {
                  const n = votes[i] ?? 0;
                  const pct = total > 0 ? Math.round((n / total) * 100) : 0;
                  const mine = poll.my_vote === i;
                  return (
                    <li key={i}>
                      <button
                        onClick={() => {
                          if (poll.status !== 'open') return;
                          if (!user) {
                            const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
                            window.location.href = `/login?returnTo=${returnUrl}`;
                            return;
                          }
                          setVoteError('');
                          vote.mutate({ pollId: poll.id, optionIndex: i }, { onError: (e: any) => setVoteError(e?.response?.data?.error || e?.message || 'Gagal memberi suara') });
                        }}
                        disabled={vote.isPending || poll.status !== 'open'}
                        className={`w-full text-left rounded-lg border px-3 py-2 text-xs transition-colors ${
                          mine
                            ? 'border-[#0071e3] bg-[#f4f8fb] text-[#0066cc]'
                            : poll.status !== 'open'
                            ? 'border-[#d2d2d7] bg-[#f5f5f7] text-[#707070] cursor-default'
                            : 'border-[#d2d2d7] bg-white hover:border-[#0071e3] hover:bg-[#f5f5f7] text-[#1d1d1f]'
                        }`}
                        aria-label={`${opt}${mine ? ' - pilihan Anda' : ''}`}
                      >
                        <span className="flex items-center justify-between gap-2 font-medium">
                          <span className="flex items-center gap-1.5 min-w-0">
                            {mine && <Check className="w-3.5 h-3.5 shrink-0 text-[#0066cc]" aria-hidden />}
                            <span className="truncate">{opt}</span>
                          </span>
                          <span className="shrink-0 tabular-nums font-semibold text-[#1d1d1f]">{pct}%</span>
                        </span>
                        <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-[#e2e2e5]">
                          <span className={`block h-full rounded-full ${poll.status !== 'open' ? 'bg-[#858585]' : 'bg-[#0071e3]'}`} style={{ width: `${pct}%` }} />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {voteError && <p className="mt-2 text-[11px] text-rose-600">{voteError}</p>}
              <p className="mt-1 text-[11px] text-[#707070]">
                {total} suara
                {poll.status !== 'open' ? (
                  <> · Polling telah ditutup (tidak menerima suara lagi)</>
                ) : user ? (
                  poll.my_vote != null ? (
                    <> · suara Anda tercatat (klik opsi lain untuk mengubah)</>
                  ) : (
                    <> · pilih salah satu untuk memberi suara</>
                  )
                ) : (
                  <> · masuk untuk memberi suara</>
                )}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
};
