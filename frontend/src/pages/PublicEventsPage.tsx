import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Clock,
  AlertCircle,
  Coins,
  CheckCircle2,
  CalendarCheck,
  Sparkles,
  Search,
  Filter,
  FileText,
  ExternalLink
} from 'lucide-react';
import { usePublicEvents, formatRupiah } from '../services/public_transparency';

const STATUS_CONFIG: Record<
  string,
  { label: string; badge: string; border: string; dot: string }
> = {
  planned: {
    label: 'Rencana',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    border: 'border-l-blue-500',
    dot: 'bg-blue-500',
  },
  ongoing: {
    label: 'Sedang Berlangsung',
    badge: 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse',
    border: 'border-l-amber-500',
    dot: 'bg-amber-500',
  },
  completed: {
    label: 'Terlaksana / Selesai',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    border: 'border-l-emerald-500',
    dot: 'bg-emerald-500',
  },
  cancelled: {
    label: 'Dibatalkan',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    border: 'border-l-rose-400',
    dot: 'bg-rose-400',
  },
};

type FilterTimeline = 'all' | 'upcoming' | 'ongoing' | 'completed';

export const PublicEventsPage: React.FC = () => {
  const { data: events, isLoading } = usePublicEvents();
  const [timelineTab, setTimelineTab] = useState<FilterTimeline>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Ekstraksi daftar tahun untuk kalender tahunan
  const availableYears = useMemo(() => {
    if (!events) return [];
    const years = new Set<string>();
    events.forEach((evt) => {
      if (evt.event_date) {
        const y = new Date(evt.event_date).getFullYear().toString();
        years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [events]);

  // Filter events
  const filteredEvents = useMemo(() => {
    if (!events) return [];
    const now = new Date();

    return events.filter((evt) => {
      // 1. Filter Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = evt.title.toLowerCase().includes(q);
        const matchDesc = evt.description?.toLowerCase().includes(q);
        const matchLoc = evt.location?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchLoc) return false;
      }

      // 2. Filter Tahun
      if (selectedYear !== 'all' && evt.event_date) {
        const evtYear = new Date(evt.event_date).getFullYear().toString();
        if (evtYear !== selectedYear) return false;
      }

      // 3. Filter Timeline Status
      if (timelineTab === 'upcoming') {
        if (evt.status === 'cancelled') return false;
        if (evt.status === 'planned') {
          if (!evt.event_date) return true;
          return new Date(evt.event_date) >= now;
        }
        return false;
      }

      if (timelineTab === 'ongoing') {
        return evt.status === 'ongoing';
      }

      if (timelineTab === 'completed') {
        return evt.status === 'completed' || (evt.event_date ? new Date(evt.event_date) < now : false);
      }

      return true;
    });
  }, [events, timelineTab, selectedYear, searchQuery]);

  // Statistik Ringkas
  const stats = useMemo(() => {
    if (!events) return { total: 0, planned: 0, ongoing: 0, completed: 0 };
    return {
      total: events.length,
      planned: events.filter((e) => e.status === 'planned').length,
      ongoing: events.filter((e) => e.status === 'ongoing').length,
      completed: events.filter((e) => e.status === 'completed').length,
    };
  }, [events]);

  return (
    <div className="pb-20 space-y-8 bg-slate-50/50 min-h-screen">
      {/* Hero Header */}
      <section className="bg-slate-900 text-white px-4 sm:px-6 py-10 sm:py-14 border-b border-slate-800 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-5xl mx-auto space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold px-3 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5" /> Kalender &amp; Rencana Kegiatan Lingkungan
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Agenda Kegiatan &amp; Program Warga
          </h1>
          <p className="max-w-2xl text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
            Informasi terbuka seluruh agenda lingkungan RT/RW: program kerja tahunan, kegiatan gotong royong berkala, hingga agenda insidentil/dadakan beserta transparansi estimasi anggarannya.
          </p>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3">
              <span className="text-slate-400 text-[11px] block font-medium">Total Agenda</span>
              <span className="text-lg font-bold text-white tabular-nums">{stats.total}</span>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3">
              <span className="text-blue-400 text-[11px] block font-medium">Rencana / Terjadwal</span>
              <span className="text-lg font-bold text-blue-300 tabular-nums">{stats.planned}</span>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3">
              <span className="text-amber-400 text-[11px] block font-medium">Sedang Berlangsung</span>
              <span className="text-lg font-bold text-amber-300 tabular-nums">{stats.ongoing}</span>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3">
              <span className="text-emerald-400 text-[11px] block font-medium">Telah Terlaksana</span>
              <span className="text-lg font-bold text-emerald-300 tabular-nums">{stats.completed}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Controls: Search, Tabs & Year Selection */}
        <div className="civic-card p-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Box */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama agenda, kegiatan, atau lokasi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {/* Filter Tahun */}
            {availableYears.length > 0 && (
              <div className="flex items-center gap-2 shrink-0">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-semibold text-slate-600">Tahun:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="all">Semua Tahun</option>
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Timeline Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
            {[
              { id: 'all', label: 'Semua Agenda' },
              { id: 'upcoming', label: 'Mendatang & Rencana' },
              { id: 'ongoing', label: 'Sedang Berjalan' },
              { id: 'completed', label: 'Riwayat / Selesai' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTimelineTab(tab.id as FilterTimeline)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                  timelineTab === tab.id
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
            <span className="ml-auto text-[11px] font-semibold text-slate-400">
              Menampilkan {filteredEvents.length} agenda
            </span>
          </div>
        </div>

        {/* Timeline Event List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-36 animate-pulse rounded-2xl bg-white border border-slate-200/80" />
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="civic-card p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Tidak Ditemukan Agenda</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || selectedYear !== 'all' || timelineTab !== 'all'
                ? 'Tidak ada agenda yang cocok dengan filter pencarian Anda.'
                : 'Belum ada agenda lingkungan yang tercatat di sistem.'}
            </p>
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-200 ml-4 sm:ml-6 pl-4 sm:pl-6 space-y-6">
            {filteredEvents.map((evt) => {
              const cfg = STATUS_CONFIG[evt.status] || {
                label: evt.status,
                badge: 'bg-slate-100 text-slate-700 border-slate-200',
                border: 'border-l-slate-400',
                dot: 'bg-slate-400',
              };

              let dateFormatted = 'Jadwal Menyesuaikan (Insidentil)';
              let isPast = false;

              if (evt.event_date) {
                const d = new Date(evt.event_date);
                isPast = d < new Date();
                dateFormatted = `${d.toLocaleDateString('id-ID', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })} · ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`;
              }

              return (
                <div key={evt.id} className="relative group">
                  {/* Timeline Dot Indicator */}
                  <div
                    className={`absolute -left-[23px] sm:-left-[31px] top-6 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ring-2 ring-slate-100 ${cfg.dot}`}
                  />

                  {/* Card Event */}
                  <article className="civic-card p-5 sm:p-6 space-y-4 hover:shadow-md transition-all border border-slate-200/80 bg-white">
                    {/* Header: Title & Badges */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${cfg.badge}`}
                          >
                            {cfg.label}
                          </span>
                          {isPast && evt.status !== 'completed' && evt.status !== 'cancelled' && (
                            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                              <CalendarCheck className="w-3 h-3" /> Tanggal Telah Lewat
                            </span>
                          )}
                          {evt.status === 'completed' && (
                            <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Dokumentasi Terlaksana
                            </span>
                          )}
                        </div>

                        <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
                          {evt.title}
                        </h3>

                        {evt.description && (
                          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-1 whitespace-pre-line">
                            {evt.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Metadata Waktu & Lokasi */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3 border-t border-slate-100 text-xs text-slate-600 font-medium">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{dateFormatted}</span>
                      </div>

                      {evt.location ? (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                          <span>{evt.location}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-400">
                          <MapPin className="w-4 h-4 shrink-0" />
                          <span>Lokasi akan diinformasikan kemudian</span>
                        </div>
                      )}
                    </div>

                    {/* Transparansi Estimasi Anggaran & Biaya (RAB) */}
                    {(Boolean(evt.estimated_cost) || Boolean(evt.actual_cost)) && (
                      <div className="mt-2 bg-slate-50 border border-slate-200/70 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 text-slate-700 font-semibold">
                          <Coins className="w-4 h-4 text-amber-600" />
                          <span>Transparansi Anggaran Kegiatan:</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-bold tabular-nums">
                          {Boolean(evt.estimated_cost) && (
                            <span className="text-slate-600">
                              RAB Rencana:{' '}
                              <span className="text-slate-900 font-extrabold">
                                {formatRupiah(evt.estimated_cost || 0)}
                              </span>
                            </span>
                          )}
                          {Boolean(evt.actual_cost) && (
                            <span className="text-emerald-700">
                              Realisasi:{' '}
                              <span className="text-emerald-900 font-extrabold">
                                {formatRupiah(evt.actual_cost || 0)}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Lampiran Dokumen: Proposal & LPJ / Laporan Pertanggungjawaban */}
                    {(evt.attachment_url || evt.report_url) && (
                      <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
                        {evt.attachment_url && (
                          <a
                            href={evt.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-medium transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                            <span>Unduh Proposal / Tor</span>
                            <ExternalLink className="w-3 h-3 opacity-60" />
                          </a>
                        )}
                        {evt.report_url && (
                          <a
                            href={evt.report_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 font-medium transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Laporan Pertanggungjawaban (LPJ)</span>
                            <ExternalLink className="w-3 h-3 opacity-60" />
                          </a>
                        )}
                      </div>
                    )}
                  </article>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
