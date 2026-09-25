import React, { useState, useMemo } from 'react';
import { BarChart3, Check, History, Users } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useOpenPolls, useVotePoll } from '../services/social';
import { useMyHouseQuery } from '../services/house';
import { Dialog } from './ui/dialog';
import { Select } from './ui/select';

/**
 * Polling Warga:
 * - Mode 'house': 1 Rumah 1 Suara (dikunci per house_id)
 * - Mode 'resident': 1 Warga 1 Suara (anggota keluarga bisa memilih namanya sendiri)
 */
export const PollWidget: React.FC = () => {
  const { user } = useAuthStore();
  const { data: myHouseData } = useMyHouseQuery();
  const [selectedResidentId, setSelectedResidentId] = useState<string>('');

  // Daftar pemilih yang tersedia dari sesi rumah
  const votersInHouse = useMemo(() => {
    const list: Array<{ id: string; name: string; relation: string }> = [];
    if (myHouseData?.head_resident?.id) {
      list.push({
        id: myHouseData.head_resident.id,
        name: myHouseData.head_resident.full_name,
        relation: 'Kepala Keluarga',
      });
    }
    if (myHouseData?.family_members) {
      myHouseData.family_members.forEach((fm) => {
        list.push({
          id: fm.id,
          name: fm.full_name,
          relation: fm.relation || 'Anggota Keluarga',
        });
      });
    }
    return list;
  }, [myHouseData]);

  // Default pemilih awal
  const activeResidentId = selectedResidentId || (votersInHouse.length > 0 ? votersInHouse[0].id : undefined);

  const { data: polls, isLoading, isError, error, refetch } = useOpenPolls(activeResidentId);
  const vote = useVotePoll();
  const [voteError, setVoteError] = useState('');
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);

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

  // Tampilkan SEMUA polling yang berstatus 'open' langsung di widget beranda warga
  // Jika tidak ada yang open, tampilkan polling terakhir yang sudah ditutup
  const openPolls = polls.filter((p) => p.status === 'open');
  const displayedPolls = openPolls.length > 0 ? openPolls : [polls[0]];

  return (
    <>
      <section aria-label="Polling warga" className="apple-card p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#d2d2d7] pb-2.5">
          <h2 className="flex items-center gap-2 text-xs sm:text-sm font-semibold uppercase tracking-wider text-[#1d1d1f]">
            <BarChart3 className="h-4 w-4 text-[#0071e3]" /> Jajak Pendapat / Polling Warga
          </h2>
          <div className="flex items-center gap-2">
            {openPolls.length > 1 && (
              <span className="text-[11px] font-semibold text-[#0071e3] bg-[#f4f8fb] px-2 py-0.5 rounded-full border border-[#d2d2d7]">
                {openPolls.length} Polling Aktif
              </span>
            )}
            {polls.length > openPolls.length && (
              <button
                type="button"
                onClick={() => setIsArchiveModalOpen(true)}
                className="text-[11px] text-[#0071e3] hover:underline font-semibold flex items-center gap-1"
              >
                <History className="w-3 h-3" /> Arsip Ditutup ({polls.length - openPolls.length})
              </button>
            )}
          </div>
        </div>
        <div className="mt-4 space-y-5">
          {displayedPolls.map((poll) => {
          const votes = poll.votes ?? [];
          const total = poll.total_votes ?? votes.reduce((a, b) => a + b, 0);
          return (
            <div key={poll.id} className="p-4 rounded-xl border border-[#d2d2d7] bg-[#fbfbfd] space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${poll.vote_scope === 'resident' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      {poll.vote_scope === 'resident' ? '1 Warga 1 Suara' : '1 Rumah 1 Suara'}
                    </span>
                    {poll.status !== 'open' && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#f5f5f7] text-[#707070] border border-[#d2d2d7]">
                        Ditutup
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-[#1d1d1f] leading-snug">{poll.question}</p>
                </div>
              </div>

              {/* Selector Anggota Keluarga jika Polling Mode 1 Warga 1 Suara */}
              {poll.vote_scope === 'resident' && votersInHouse.length > 0 && poll.status === 'open' && (
                <div className="p-2.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-lg space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-[#1d1d1f] flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-[#0071e3]" /> Pilih Anggota Keluarga yang Memilih:
                    </span>
                  </div>
                  <Select
                    value={activeResidentId || ''}
                    onValueChange={(val) => setSelectedResidentId(val)}
                  >
                    {votersInHouse.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.relation})
                      </option>
                    ))}
                  </Select>
                </div>
              )}

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
                          vote.mutate(
                            {
                              pollId: poll.id,
                              optionIndex: i,
                              residentId: poll.vote_scope === 'resident' ? activeResidentId : undefined,
                            },
                            {
                              onError: (e: any) => setVoteError(e?.response?.data?.error || e?.message || 'Gagal memberi suara'),
                            }
                          );
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

    {/* Modal Riwayat & Arsip Semua Polling */}
    {isArchiveModalOpen && (
      <Dialog
        isOpen={true}
        onClose={() => setIsArchiveModalOpen(false)}
        title=""
        description=""
        className="max-w-2xl w-full"
      >
        <div className="flex flex-col max-h-[85vh]">
          <div className="px-6 py-4 border-b border-[#d2d2d7] bg-[#f5f5f7] flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#1d1d1f] flex items-center gap-2">
                <History className="w-4 h-4 text-[#0071e3]" /> Riwayat Jajak Pendapat Warga
              </h2>
              <p className="text-xs text-[#707070]">
                Arsip polling dan hasil pemungutan suara aspirasi warga RT.
              </p>
            </div>
            <button
              onClick={() => setIsArchiveModalOpen(false)}
              className="apple-btn-secondary text-xs px-3 py-1"
            >
              Tutup
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-6 divide-y divide-[#d2d2d7]">
            {polls.map((poll) => {
              const votes = poll.votes ?? [];
              const total = poll.total_votes ?? votes.reduce((a, b) => a + b, 0);
              const isOpen = poll.status === 'open';

              return (
                <div key={poll.id} className="pt-5 first:pt-0 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${poll.vote_scope === 'resident' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {poll.vote_scope === 'resident' ? '1 Warga 1 Suara' : '1 Rumah 1 Suara'}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-[#1d1d1f] leading-snug">
                        {poll.question}
                      </h3>
                    </div>
                    <span
                      className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        isOpen
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-[#f5f5f7] text-[#707070] border-[#d2d2d7]'
                      }`}
                    >
                      {isOpen ? 'Aktif' : 'Ditutup'}
                    </span>
                  </div>

                  {/* Selector Anggota Keluarga jika Polling Mode 1 Warga 1 Suara di modal */}
                  {poll.vote_scope === 'resident' && votersInHouse.length > 0 && isOpen && (
                    <div className="p-2.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-lg space-y-1">
                      <span className="font-semibold text-[#1d1d1f] text-[11px] flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-[#0071e3]" /> Pilih Anggota Keluarga yang Memilih:
                      </span>
                      <Select
                        value={activeResidentId || ''}
                        onValueChange={(val) => setSelectedResidentId(val)}
                      >
                        {votersInHouse.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name} ({v.relation})
                          </option>
                        ))}
                      </Select>
                    </div>
                  )}

                  <ul className="space-y-1.5">
                    {poll.options.map((opt, i) => {
                      const n = votes[i] ?? 0;
                      const pct = total > 0 ? Math.round((n / total) * 100) : 0;
                      const mine = poll.my_vote === i;

                      return (
                        <li key={i}>
                          <button
                            onClick={() => {
                              if (!isOpen) return;
                              if (!user) {
                                const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
                                window.location.href = `/login?returnTo=${returnUrl}`;
                                return;
                              }
                              setVoteError('');
                              vote.mutate(
                                {
                                  pollId: poll.id,
                                  optionIndex: i,
                                  residentId: poll.vote_scope === 'resident' ? activeResidentId : undefined,
                                },
                                {
                                  onError: (e: any) => setVoteError(e?.response?.data?.error || e?.message || 'Gagal memberi suara'),
                                }
                              );
                            }}
                            disabled={vote.isPending || !isOpen}
                            className={`w-full text-left rounded-lg border px-3 py-2 text-xs transition-colors ${
                              mine
                                ? 'border-[#0071e3] bg-[#f4f8fb] text-[#0066cc]'
                                : !isOpen
                                ? 'border-[#d2d2d7] bg-[#f5f5f7] text-[#707070] cursor-default'
                                : 'border-[#d2d2d7] bg-white hover:border-[#0071e3] hover:bg-[#f5f5f7] text-[#1d1d1f]'
                            }`}
                          >
                            <div className="flex items-center justify-between font-medium">
                              <span className="flex items-center gap-1.5 text-[#1d1d1f]">
                                {mine && <Check className="w-3.5 h-3.5 text-[#0066cc]" />}
                                <span>{opt}</span>
                              </span>
                              <span className="tabular-nums font-semibold text-[#1d1d1f]">
                                {pct}% ({n} suara)
                              </span>
                            </div>
                            <div className="mt-1.5 h-1.5 rounded-full bg-[#e2e2e5] overflow-hidden">
                              <div
                                className={`h-full rounded-full ${isOpen ? 'bg-[#0071e3]' : 'bg-[#858585]'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>

                  <p className="text-[11px] text-[#707070]">
                    Total {total} warga berpartisipasi
                    {isOpen ? ' · Polling masih menerima suara' : ' · Polling selesai diarsipkan'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </Dialog>
    )}
  </>
);
};
