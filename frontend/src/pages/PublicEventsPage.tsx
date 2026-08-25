import React from 'react';
import { CalendarDays, MapPin, Clock, AlertCircle } from 'lucide-react';
import { usePublicEvents } from '../services/public_transparency';

const STATUS_LABEL: Record<string, string> = {
  planned: 'Terjadwal',
  ongoing: 'Berlangsung',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

export const PublicEventsPage: React.FC = () => {
  const { data: events, isLoading } = usePublicEvents();

  return (
    <div className="pb-16">
      {/* Kepala halaman: solid, left-aligned — konsisten dengan seluruh portal */}
      <section className="bg-slate-900 text-white px-4 sm:px-6 py-10">
        <div className="max-w-6xl mx-auto space-y-4">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
            Jadwal &amp; Agenda Kegiatan
          </h1>
          <p className="max-w-2xl text-sm text-slate-300 leading-relaxed">
            Kerja bakti, posyandu, musyawarah RT — semua agenda terbuka untuk warga.
            Datang dan berpartisipasilah.
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-5">
        <div className="flex items-baseline justify-between border-b border-slate-200 pb-3">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
            <CalendarDays className="w-5 h-5 text-emerald-700" /> Agenda Mendatang
          </h2>
          <span className="text-xs font-semibold text-slate-500 tabular-nums">
            {events?.length ?? 0} kegiatan
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-28 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : !events || events.length === 0 ? (
          <div className="border border-dashed border-slate-300 rounded-xl p-10 text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">Belum Ada Agenda</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Kegiatan mendatang akan tampil di sini setelah diumumkan pengurus.
            </p>
          </div>
        ) : (
          <ol className="relative space-y-4 border-l-2 border-slate-200 pl-5 ml-2">
            {events.map((evt) => {
              const d = new Date(evt.event_date);
              return (
                <li key={evt.id} className="relative">
                  {/* titik timeline */}
                  <span
                    aria-hidden
                    className="absolute -left-[27px] top-5 h-3 w-3 rounded-full border-2 border-emerald-700 bg-white"
                  />
                  <article className="rounded-xl border border-slate-200 bg-white p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-base font-bold text-slate-900 leading-snug">{evt.title}</h3>
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                        {STATUS_LABEL[evt.status] ?? evt.status}
                      </span>
                    </div>
                    {evt.description && (
                      <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{evt.description}</p>
                    )}
                    <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                      <p className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" aria-hidden />
                        <span>
                          {d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                          {' · '}
                          {d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                        </span>
                      </p>
                      {evt.location && (
                        <p className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" aria-hidden />
                          <span>{evt.location}</span>
                        </p>
                      )}
                    </div>
                  </article>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
};
