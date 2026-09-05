import React, { useState } from 'react';
import { BarChart3, Check, Plus, Trash2, X, Vote, FileText, MessageSquareHeart } from 'lucide-react';
import { useOpenPolls, useCreatePoll, useClosePoll } from '../services/social';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { SimpleDialog } from '../components/ui/dialog';
import { PageHeaderTabs } from '../components/ui/PageHeaderTabs';

export const PollsPage: React.FC = () => {
  const { data: polls, isLoading, isError, error, refetch } = useOpenPolls();
  const createPoll = useCreatePoll();
  const closePoll = useClosePoll();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [formError, setFormError] = useState('');

  const addOption = () => {
    if (options.length >= 6) return;
    setOptions([...options, '']);
  };
  const removeOption = (idx: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== idx));
  };
  const updateOption = (idx: number, val: string) => {
    const next = [...options];
    next[idx] = val;
    setOptions(next);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const trimmedQ = question.trim();
    const trimmedOpts = options.map(o => o.trim()).filter(Boolean);
    if (!trimmedQ) { setFormError('Pertanyaan wajib diisi'); return; }
    if (trimmedOpts.length < 2) { setFormError('Minimal 2 opsi'); return; }
    if (trimmedOpts.length > 6) { setFormError('Maksimal 6 opsi'); return; }
    createPoll.mutate(
      { question: trimmedQ, options: trimmedOpts },
      {
        onSuccess: () => {
          setQuestion('');
          setOptions(['', '']);
          setIsCreateOpen(false);
        },
        onError: (err: any) => {
          setFormError(err?.response?.data?.error || err?.message || 'Gagal membuat polling');
        },
      }
    );
  };

  const commTabs = [
    { to: '/admin/announcements', label: 'Pengumuman & Dokumen', icon: FileText },
    { to: '/admin/aspirations', label: 'Aspirasi & Kebutuhan', icon: MessageSquareHeart },
    { to: '/admin/polls', label: 'Polling Warga', icon: Vote },
  ];

  return (
    <div className="space-y-6">
      <PageHeaderTabs
        title="Kelola Polling"
        description="Pusat informasi resmi RT, publikasi berkas, penampungan usulan, dan polling suara warga."
        tabs={commTabs}
        actions={
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Buat Polling
          </Button>
        }
      />

      {isLoading ? (
        <div className="p-6 text-center text-gray-500">Memuat polling...</div>
      ) : isError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          Gagal memuat polling: {(error as Error)?.message || 'coba lagi'}{' '}
          <button onClick={() => refetch()} className="underline font-semibold">Muat ulang</button>
        </div>
      ) : !polls || polls.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center">
          <BarChart3 className="h-10 w-10 mx-auto text-slate-300 mb-3" />
          <p className="text-gray-500">Belum ada polling. Buat polling pertama untuk warga.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {polls.map((poll) => {
            const votes = poll.votes ?? [];
            const total = poll.total_votes ?? votes.reduce((a, b) => a + b, 0);
            return (
              <div key={poll.id} className="bg-white rounded-xl border shadow-sm p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 leading-snug">{poll.question}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {poll.status === 'open' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">Buka</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border font-semibold">Ditutup</span>
                      )}
                      {' '}· {total} suara
                    </p>
                  </div>
                  {poll.status === 'open' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-rose-600 border-rose-200 hover:bg-rose-50 shrink-0"
                      disabled={closePoll.isPending}
                      onClick={() => {
                        if (confirm('Tutup polling ini? Tidak bisa dibuka lagi.')) closePoll.mutate(poll.id);
                      }}
                    >
                      <X className="h-4 w-4 mr-1" /> Tutup
                    </Button>
                  )}
                </div>
                <ul className="mt-4 space-y-2">
                  {poll.options.map((opt, i) => {
                    const n = votes[i] ?? 0;
                    const pct = total > 0 ? Math.round((n / total) * 100) : 0;
                    const mine = poll.my_vote === i;
                    return (
                      <li key={i} className={`rounded-lg border px-3 py-2 text-sm ${mine ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 font-semibold text-slate-700 min-w-0">
                            {mine && <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />}
                            <span className="truncate">{opt}</span>
                          </span>
                          <span className="tabular-nums text-xs text-slate-500">{n} ({pct}%)</span>
                        </div>
                        <div className="mt-1.5 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                          <div className="h-full bg-emerald-600 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      <SimpleDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Buat Polling Baru"
        description="Pertanyaan + 2 sampai 6 opsi. Hanya admin yang bisa membuat."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pollQ">Pertanyaan</Label>
            <Input id="pollQ" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Contoh: Kapan waktu kerja bakti?" required />
          </div>
          <div className="space-y-2">
            <Label>Opsi ({options.length}/6)</Label>
            {options.map((opt, idx) => (
              <div key={idx} className="flex gap-2">
                <Input value={opt} onChange={(e) => updateOption(idx, e.target.value)} placeholder={`Opsi ${idx + 1}`} />
                <Button type="button" variant="outline" size="sm" disabled={options.length <= 2} onClick={() => removeOption(idx)} className="shrink-0">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {options.length < 6 && (
              <Button type="button" variant="outline" size="sm" onClick={addOption} className="w-full">
                <Plus className="h-4 w-4 mr-1" /> Tambah Opsi
              </Button>
            )}
          </div>
          {formError && <p className="text-xs font-semibold text-rose-600">{formError}</p>}
          {createPoll.isError && <p className="text-xs text-rose-600">{(createPoll.error as Error)?.message}</p>}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Batal</Button>
            <Button type="submit" disabled={createPoll.isPending}>{createPoll.isPending ? 'Menyimpan...' : 'Buat Polling'}</Button>
          </div>
        </form>
      </SimpleDialog>
    </div>
  );
};
export default PollsPage;
