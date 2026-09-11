import React, { useState } from 'react';
import { ScrollText, MapPin, Calendar, CheckCircle2, ListTodo, X, ExternalLink } from 'lucide-react';
import { usePublicMeetings, PublicMeeting } from '../services/public_transparency';

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Akan Datang',
  ongoing: 'Berlangsung',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

const MEETING_TYPE_LABEL: Record<string, string> = {
  regular: 'Rapat Rutin Bulanan',
  emergency: 'Rapat Darurat / Luar Biasa',
  karang_taruna: 'Rapat Pemuda / Karang Taruna',
  rtrw_pleno: 'Rapat Pleno RT/RW',
};

/**
 * Keputusan musyawarah publik — hanya meeting visibility=public
 * (ditegakkan server-side; widget ini hanya membaca endpoint publik).
 */
export const MeetingDecisionsWidget: React.FC = () => {
  const { data: meetings, isLoading } = usePublicMeetings();
  const [selectedMeeting, setSelectedMeeting] = useState<PublicMeeting | null>(null);

  if (isLoading) {
    return <div className="h-32 animate-pulse rounded-2xl bg-slate-100" aria-label="Memuat notulen rapat" />;
  }

  if (!meetings || meetings.length === 0) return null;

  return (
    <>
      <section aria-label="Notulen musyawarah publik" className="civic-card p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-800">
            <ScrollText className="h-4 w-4 text-emerald-600" /> Keputusan Musyawarah
          </h2>
          <span className="text-[10px] text-slate-400 font-semibold">Klik untuk rincian</span>
        </div>
        <ul className="divide-y divide-slate-100 space-y-1">
          {meetings.slice(0, 4).map((m) => (
            <li
              key={m.id}
              onClick={() => setSelectedMeeting(m)}
              className="pt-3 first:pt-0 pb-2 cursor-pointer hover:bg-slate-50/80 -mx-2 px-2 rounded-xl transition group"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-700 leading-snug flex items-center gap-1.5 transition-colors">
                  <span>{m.title}</span>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                </h3>
                <span className="shrink-0 text-[10px] font-bold text-slate-400 tabular-nums">
                  {new Date(m.meeting_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                </span>
              </div>
              {m.agenda && (
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600">{m.agenda}</p>
              )}
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-rose-500" /> {m.location}
                </span>
                <span
                  className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                    m.status === 'completed'
                      ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                      : m.status === 'ongoing'
                      ? 'text-amber-800 bg-amber-50 border border-amber-200'
                      : 'text-blue-700 bg-blue-50 border border-blue-200'
                  }`}
                >
                  {STATUS_LABEL[m.status] ?? m.status}
                </span>
                {m.decisions && m.decisions.length > 0 && (
                  <span className="text-[10px] text-emerald-800 bg-emerald-100/60 font-semibold px-1.5 py-0.5 rounded">
                    {m.decisions.length} Keputusan
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Modal Detail Notulen & Keputusan Musyawarah Publik */}
      {selectedMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl sm:max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                    {MEETING_TYPE_LABEL[selectedMeeting.meeting_type] || selectedMeeting.meeting_type}
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                      selectedMeeting.status === 'completed'
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                        : selectedMeeting.status === 'ongoing'
                        ? 'text-amber-800 bg-amber-50 border-amber-200'
                        : 'text-blue-700 bg-blue-50 border-blue-200'
                    }`}
                  >
                    {STATUS_LABEL[selectedMeeting.status] || selectedMeeting.status}
                  </span>
                </div>
                <h2 className="text-lg font-extrabold text-slate-900 leading-snug">
                  {selectedMeeting.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedMeeting(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm">
              {/* Info Waktu & Tempat */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    {new Date(selectedMeeting.meeting_date).toLocaleDateString('id-ID', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{selectedMeeting.location}</span>
                </div>
              </div>

              {/* Agenda Pembahasan */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Agenda / Pembahasan Musyawarah:
                </h4>
                <p className="text-slate-700 whitespace-pre-line leading-relaxed bg-slate-50/60 p-3 rounded-xl border border-slate-100">
                  {selectedMeeting.agenda || 'Tidak ada catatan agenda khusus.'}
                </p>
              </div>

              {/* Keputusan Musyawarah yang Disepakati */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Hasil &amp; Keputusan yang Disepakati:
                </h4>
                {selectedMeeting.decisions && selectedMeeting.decisions.length > 0 ? (
                  <div className="space-y-2">
                    {selectedMeeting.decisions.map((dec, idx) => (
                      <div
                        key={dec.id || idx}
                        className="p-3 rounded-xl border border-emerald-200/80 bg-emerald-50/40 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider bg-emerald-100 px-2 py-0.5 rounded">
                            {dec.category || 'Keputusan'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-800 font-medium leading-relaxed">
                          {dec.decision_text}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200">
                    Belum ada butir keputusan resmi yang dicatatkan pada musyawarah ini.
                  </p>
                )}
              </div>

              {/* Tugas Tindak Lanjut (Action Items) Publik */}
              {selectedMeeting.action_items && selectedMeeting.action_items.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ListTodo className="w-4 h-4 text-indigo-600" />
                    Tindak Lanjut &amp; Penugasan:
                  </h4>
                  <div className="space-y-2">
                    {selectedMeeting.action_items.map((act, idx) => (
                      <div
                        key={act.id || idx}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <p className="font-semibold text-slate-900">{act.task}</p>
                          <p className="text-[11px] text-slate-500">
                            Penanggung Jawab: <span className="font-medium text-slate-700">{act.assignee_name}</span>
                            {act.due_date && ` · Target: ${act.due_date}`}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            act.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {act.status === 'completed' ? 'Selesai' : 'Pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedMeeting(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition shadow-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
