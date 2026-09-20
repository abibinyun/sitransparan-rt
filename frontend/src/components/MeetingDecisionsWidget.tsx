import React, { useState } from 'react';
import { ScrollText, MapPin, Calendar, CheckCircle2, ListTodo, ExternalLink } from 'lucide-react';
import { Dialog } from './ui/dialog';
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
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterYear, setFilterYear] = useState<string>('ALL');
  const [filterMonth, setFilterMonth] = useState<string>('ALL');

  if (isLoading) {
    return <div className="h-32 animate-pulse rounded-2xl bg-slate-100" aria-label="Memuat notulen rapat" />;
  }

  if (!meetings || meetings.length === 0) return null;

  // Ekstraksi daftar tahun unik dari rapat
  const availableYears = Array.from(
    new Set(
      meetings.map((m) => {
        const d = new Date(m.meeting_date);
        return isNaN(d.getFullYear()) ? '' : String(d.getFullYear());
      }).filter(Boolean)
    )
  ).sort((a, b) => Number(b) - Number(a));

  const filteredMeetings = meetings.filter((m) => {
    const d = new Date(m.meeting_date);
    const mYear = String(d.getFullYear());
    const mMonth = String(d.getMonth() + 1); // 1-12

    const matchSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.agenda || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = filterType === 'ALL' || m.meeting_type === filterType;
    const matchYear = filterYear === 'ALL' || mYear === filterYear;
    const matchMonth = filterMonth === 'ALL' || mMonth === filterMonth;

    return matchSearch && matchType && matchYear && matchMonth;
  });

  return (
    <>
      <section aria-label="Notulen musyawarah publik" className="apple-card p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xs sm:text-sm font-semibold uppercase tracking-wider text-[#1d1d1f]">
            <ScrollText className="h-4 w-4 text-[#0071e3]" /> Keputusan Musyawarah
          </h2>
          <button
            type="button"
            onClick={() => setIsArchiveModalOpen(true)}
            className="text-[11px] text-[#0071e3] hover:underline font-semibold"
          >
            Lihat Semua ({meetings.length})
          </button>
        </div>
        <ul className="divide-y divide-[#d2d2d7] space-y-1">
          {meetings.slice(0, 4).map((m) => (
            <li
              key={m.id}
              onClick={() => setSelectedMeeting(m)}
              className="pt-3 first:pt-0 pb-2 cursor-pointer hover:bg-[#f5f5f7] -mx-2 px-2 rounded-lg transition group"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-xs sm:text-sm font-semibold text-[#1d1d1f] group-hover:text-[#0071e3] leading-snug flex items-center gap-1.5 transition-colors">
                  <span>{m.title}</span>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-80 transition-opacity text-[#0071e3]" />
                </h3>
                <span className="shrink-0 text-[10px] font-mono text-[#707070] tabular-nums">
                  {new Date(m.meeting_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                </span>
              </div>
              {m.agenda && (
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#474747]">{m.agenda}</p>
              )}
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-[#707070]">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-[#0071e3]" /> {m.location}
                </span>
                <span
                  className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                    m.status === 'completed'
                      ? 'text-[#0066cc] bg-[#f4f8fb] border border-[#d2d2d7]'
                      : m.status === 'ongoing'
                      ? 'text-amber-700 bg-amber-50 border border-amber-200'
                      : 'text-[#707070] bg-[#f5f5f7] border border-[#d2d2d7]'
                  }`}
                >
                  {STATUS_LABEL[m.status] ?? m.status}
                </span>
                {m.decisions && m.decisions.length > 0 && (
                  <span className="text-[10px] text-[#0066cc] bg-[#f4f8fb] font-semibold px-2 py-0.5 rounded-full border border-[#d2d2d7]">
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
        <Dialog
          isOpen={true}
          onClose={() => setSelectedMeeting(null)}
          title=""
          description=""
          className="max-w-2xl sm:max-w-3xl w-full"
        >
          <div className="flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#d2d2d7] flex items-start justify-between gap-4 bg-[#f5f5f7]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="apple-badge">
                    {MEETING_TYPE_LABEL[selectedMeeting.meeting_type] || selectedMeeting.meeting_type}
                  </span>
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                      selectedMeeting.status === 'completed'
                        ? 'text-[#0066cc] bg-[#f4f8fb] border-[#d2d2d7]'
                        : selectedMeeting.status === 'ongoing'
                        ? 'text-amber-700 bg-amber-50 border-amber-200'
                        : 'text-[#707070] bg-[#f5f5f7] border-[#d2d2d7]'
                    }`}
                  >
                    {STATUS_LABEL[selectedMeeting.status] || selectedMeeting.status}
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-[#1d1d1f] leading-snug">
                  {selectedMeeting.title}
                </h2>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm">
              {/* Info Waktu & Tempat */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-lg bg-[#f5f5f7] border border-[#d2d2d7] text-xs">
                <div className="flex items-center gap-2 text-[#1d1d1f]">
                  <Calendar className="w-4 h-4 text-[#0071e3] shrink-0" />
                  <span>
                    {new Date(selectedMeeting.meeting_date).toLocaleDateString('id-ID', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[#1d1d1f]">
                  <MapPin className="w-4 h-4 text-[#0071e3] shrink-0" />
                  <span>{selectedMeeting.location}</span>
                </div>
              </div>

              {/* Agenda Pembahasan */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-[#1d1d1f] uppercase tracking-wider">
                  Agenda / Pembahasan Musyawarah:
                </h4>
                <p className="text-[#333333] whitespace-pre-line leading-relaxed bg-[#f5f5f7] p-3 rounded-lg border border-[#d2d2d7]">
                  {selectedMeeting.agenda || 'Tidak ada catatan agenda khusus.'}
                </p>
              </div>

              {/* Keputusan Musyawarah yang Disepakati */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-[#1d1d1f] uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#0071e3]" />
                  Hasil &amp; Keputusan yang Disepakati:
                </h4>
                {selectedMeeting.decisions && selectedMeeting.decisions.length > 0 ? (
                  <div className="space-y-2">
                    {selectedMeeting.decisions.map((dec, idx) => (
                      <div
                        key={dec.id || idx}
                        className="p-3.5 rounded-lg border border-[#d2d2d7] bg-[#f4f8fb] space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-semibold text-[#0066cc] uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-[#d2d2d7]">
                            {dec.category || 'Keputusan'}
                          </span>
                        </div>
                        <p className="text-xs text-[#1d1d1f] font-medium leading-relaxed">
                          {dec.decision_text}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#707070] italic bg-[#f5f5f7] p-3 rounded-lg border border-dashed border-[#d2d2d7]">
                    Belum ada butir keputusan resmi yang dicatatkan pada musyawarah ini.
                  </p>
                )}
              </div>

              {/* Tugas Tindak Lanjut (Action Items) Publik */}
              {selectedMeeting.action_items && selectedMeeting.action_items.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-[#1d1d1f] uppercase tracking-wider flex items-center gap-1.5">
                    <ListTodo className="w-4 h-4 text-[#0071e3]" />
                    Tindak Lanjut &amp; Penugasan:
                  </h4>
                  <div className="space-y-2">
                    {selectedMeeting.action_items.map((act, idx) => (
                      <div
                        key={act.id || idx}
                        className="p-3 rounded-lg border border-[#d2d2d7] bg-white flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <p className="font-semibold text-[#1d1d1f]">{act.task}</p>
                          <p className="text-[11px] text-[#707070]">
                            Penanggung Jawab: <span className="font-medium text-[#1d1d1f]">{act.assignee_name}</span>
                            {act.due_date && ` · Target: ${act.due_date}`}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            act.status === 'completed'
                              ? 'bg-[#f4f8fb] text-[#0066cc] border border-[#d2d2d7]'
                              : 'bg-[#f5f5f7] text-[#707070] border border-[#d2d2d7]'
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
            <div className="px-6 py-3 border-t border-[#d2d2d7] bg-[#f5f5f7] flex justify-end">
              <button
                onClick={() => setSelectedMeeting(null)}
                className="apple-btn-secondary text-xs px-4 py-1.5"
              >
                Tutup
              </button>
            </div>
          </div>
        </Dialog>
      )}
      {/* Modal Arsip Riwayat Semua Musyawarah */}
      {isArchiveModalOpen && (
        <Dialog
          isOpen={true}
          onClose={() => setIsArchiveModalOpen(false)}
          title=""
          description=""
          className="max-w-3xl w-full"
        >
          <div className="flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-[#d2d2d7] bg-[#f5f5f7] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-[#1d1d1f] flex items-center gap-2">
                    <ScrollText className="w-4 h-4 text-[#0071e3]" /> Arsip Notulen &amp; Keputusan Musyawarah
                  </h2>
                  <p className="text-xs text-[#707070]">
                    Dokumentasi hasil rapat terbuka warga, notula, dan poin keputusan bersama.
                  </p>
                </div>
                <button
                  onClick={() => setIsArchiveModalOpen(false)}
                  className="apple-btn-secondary text-xs px-3 py-1"
                >
                  Tutup
                </button>
              </div>

              {/* Filter Bar: Search, Pill Type, dan Dropdown Date (Bulan/Tahun) */}
              <div className="space-y-2 pt-1">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Cari kata kunci, topik, atau lokasi musyawarah..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full text-xs pl-3 pr-8 py-2 rounded-full bg-white border border-[#d2d2d7] focus:outline-none focus:border-[#0071e3]"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Dropdown Filter Group: Jenis Rapat, Bulan, & Tahun */}
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      aria-label="Filter Jenis Musyawarah"
                      className="text-xs px-3 py-2 rounded-full bg-white border border-[#d2d2d7] text-[#1d1d1f] focus:outline-none focus:border-[#0071e3]"
                    >
                      <option value="ALL">Semua Jenis Rapat</option>
                      <option value="regular">Rapat Rutin</option>
                      <option value="emergency">Darurat / Luar Biasa</option>
                      <option value="karang_taruna">Kepemudaan</option>
                      <option value="rtrw_pleno">Pleno RT/RW</option>
                    </select>

                    <select
                      value={filterMonth}
                      onChange={(e) => setFilterMonth(e.target.value)}
                      aria-label="Filter Bulan"
                      className="text-xs px-3 py-2 rounded-full bg-white border border-[#d2d2d7] text-[#1d1d1f] focus:outline-none focus:border-[#0071e3]"
                    >
                      <option value="ALL">Semua Bulan</option>
                      <option value="1">Januari</option>
                      <option value="2">Februari</option>
                      <option value="3">Maret</option>
                      <option value="4">April</option>
                      <option value="5">Mei</option>
                      <option value="6">Juni</option>
                      <option value="7">Juli</option>
                      <option value="8">Agustus</option>
                      <option value="9">September</option>
                      <option value="10">Oktober</option>
                      <option value="11">November</option>
                      <option value="12">Desember</option>
                    </select>

                    <select
                      value={filterYear}
                      onChange={(e) => setFilterYear(e.target.value)}
                      aria-label="Filter Tahun"
                      className="text-xs px-3 py-2 rounded-full bg-white border border-[#d2d2d7] text-[#1d1d1f] focus:outline-none focus:border-[#0071e3]"
                    >
                      <option value="ALL">Semua Tahun</option>
                      {availableYears.map((yr) => (
                        <option key={yr} value={yr}>
                          {yr}
                        </option>
                      ))}
                    </select>

                    {(searchQuery || filterType !== 'ALL' || filterMonth !== 'ALL' || filterYear !== 'ALL') && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setFilterType('ALL');
                          setFilterMonth('ALL');
                          setFilterYear('ALL');
                        }}
                        className="text-[11px] text-[#0071e3] hover:underline font-semibold whitespace-nowrap px-1"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-3">
              {filteredMeetings.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#707070]">
                  Tidak ada notulen musyawarah yang cocok dengan filter.
                </div>
              ) : (
                filteredMeetings.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => {
                      setSelectedMeeting(m);
                    }}
                    className="apple-card p-4 hover:border-[#0071e3] cursor-pointer transition space-y-2 group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="apple-badge text-[10px]">
                            {MEETING_TYPE_LABEL[m.meeting_type] || m.meeting_type}
                          </span>
                          <span className="text-[11px] text-[#707070]">
                            {new Date(m.meeting_date).toLocaleDateString('id-ID', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <h3 className="font-semibold text-sm text-[#1d1d1f] group-hover:text-[#0071e3] transition mt-1">
                          {m.title}
                        </h3>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-[#0071e3] shrink-0 opacity-0 group-hover:opacity-100 transition" />
                    </div>
                    {m.agenda && (
                      <p className="text-xs text-[#474747] line-clamp-2">{m.agenda}</p>
                    )}
                    <div className="flex items-center gap-2 text-[11px] text-[#707070] pt-1 border-t border-slate-100">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#0071e3]" /> {m.location}
                      </span>
                      {m.decisions && m.decisions.length > 0 && (
                        <span className="text-[#0066cc] bg-[#f4f8fb] px-2 py-0.5 rounded-full border border-[#d2d2d7] font-semibold text-[10px]">
                          {m.decisions.length} Keputusan
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
};
