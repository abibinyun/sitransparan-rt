import React, { useState } from 'react';
import {
  CalendarDays,
  MapPin,
  Clock,
  AlertCircle,
  Check,
  CalendarCheck2
} from 'lucide-react';
import { usePublicEvents } from '../services/public_transparency';
import { EventRSVPModal } from '../components/EventRSVPModal';
import { EventItem } from '../types/event';

const STATUS_LABEL: Record<string, string> = {
  planned: 'Terjadwal',
  ongoing: 'Sedang Berlangsung',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

const STATUS_STYLE: Record<string, string> = {
  planned: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  ongoing: 'bg-blue-50 text-blue-800 border-blue-200 animate-pulse',
  completed: 'bg-slate-100 text-slate-700 border-slate-200',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const PublicEventsPage: React.FC = () => {
  const { data: events, isLoading } = usePublicEvents();
  const [selectedEventForRSVP, setSelectedEventForRSVP] = useState<EventItem | null>(null);
  const [rsvpSuccessMsg, setRsvpSuccessMsg] = useState('');

  return (
    <div className="pb-16 space-y-8">
      {/* Hero Section */}
      <section className="bg-slate-900 text-white px-4 sm:px-6 py-10 sm:py-14 border-b border-slate-800">
        <div className="max-w-6xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold px-3 py-1 rounded-full">
            <CalendarDays className="w-3.5 h-3.5" /> Kalender Gotong Royong
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Jadwal &amp; Agenda Kegiatan Lingkungan
          </h1>
          <p className="max-w-2xl text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
            Jadwal kerja bakti, posyandu balita/lansia, musyawarah warga, dan turnamen olahraga pemuda. Hadir dan berpartisipasilah!
          </p>
        </div>
      </section>

      {rsvpSuccessMsg && (
        <div className="max-w-4xl mx-auto px-4">
          <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-950 rounded-xl text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-700" /> {rsvpSuccessMsg}
          </div>
        </div>
      )}

      {/* Main Timeline List */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <h2 className="text-lg font-extrabold text-slate-900">Daftar Agenda Mendatang</h2>
          </div>
          <span className="text-xs font-semibold text-slate-500 tabular-nums">
            {events?.length || 0} agenda
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-36 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : !events || events.length === 0 ? (
          <div className="civic-card p-12 text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">Belum Ada Agenda Terjadwal</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Kegiatan lingkungan yang diumumkan pengurus RT akan otomatis tampil di kalender ini.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((evt) => {
              const d = new Date(evt.event_date);
              const isPast = d < new Date();

              return (
                <article
                  key={evt.id}
                  className="civic-card p-5 sm:p-6 space-y-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${
                            STATUS_STYLE[evt.status] || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {STATUS_LABEL[evt.status] || evt.status}
                        </span>
                        {isPast && (
                          <span className="text-[11px] font-medium text-slate-400">
                            (Sudah terlaksana)
                          </span>
                        )}
                      </div>

                      <h3 className="text-base sm:text-xl font-bold text-slate-900 leading-snug">
                        {evt.title}
                      </h3>

                      {evt.description && (
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-1">
                          {evt.description}
                        </p>
                      )}
                    </div>

                    {/* Tombol RSVP Warga */}
                    {evt.status === 'planned' && (
                      <button
                        onClick={() => setSelectedEventForRSVP(evt as any)}
                        className="inline-flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 font-bold text-xs px-4 py-2.5 rounded-xl transition-colors shrink-0"
                      >
                        <CalendarCheck2 className="w-4 h-4 text-emerald-600" /> Konfirmasi Hadir (RSVP)
                      </button>
                    )}
                  </div>

                  {/* Metadata Waktu & Lokasi */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3 border-t border-slate-100 text-xs text-slate-600 font-medium">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        {d.toLocaleDateString('id-ID', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                        {' · '}
                        {d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                      </span>
                    </div>

                    {evt.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                        <span>{evt.location}</span>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal RSVP */}
      {selectedEventForRSVP && (
        <EventRSVPModal
          isOpen={Boolean(selectedEventForRSVP)}
          event={selectedEventForRSVP}
          onClose={() => setSelectedEventForRSVP(null)}
          onSaved={() => {
            setSelectedEventForRSVP(null);
            setRsvpSuccessMsg('Terima kasih! Konfirmasi kehadiran Anda telah tercatat.');
            setTimeout(() => setRsvpSuccessMsg(''), 4000);
          }}
        />
      )}
    </div>
  );
};
