import React from 'react';
import { CalendarDays, MapPin, Clock, Sparkles } from 'lucide-react';

export const PublicEventsPage: React.FC = () => {
  const events = [
    {
      id: '1',
      title: 'Kerja Bakti Bersih Lingkungan & Fogging RT 05',
      date: '2026-08-10',
      time: '07:30 WIB',
      location: 'Area Fasum & Saluran Air RT 05',
      description: 'Kegiatan gotong royong warga membersihkan selokan, pemangkasan dahan pohon, serta fogging antisipasi DBD.',
      category: 'Kerja Bakti',
      status: 'UPCOMING'
    },
    {
      id: '2',
      title: 'Posyandu Balita & Lansia Ceria',
      date: '2026-08-15',
      time: '08:30 - 11:30 WIB',
      location: 'Balai Warga RT 05',
      description: 'Pemeriksaan kesehatan gratis balita, imunisasi rutin, dan cek tekanan darah & gula darah lansia.',
      category: 'Kesehatan',
      status: 'UPCOMING'
    },
    {
      id: '3',
      title: 'Musyawarah RT & Laporan Kas Semesteran',
      date: '2026-08-22',
      time: '19:30 WIB (Ba-da Isya)',
      location: 'Balai Warga RT 05',
      description: 'Rapat rutin pengurus dan warga penyampaian pertanggungjawaban keuangan kas RT serta pembahasan persiapan Lomba 17-an.',
      category: 'Rapat Warga',
      status: 'UPCOMING'
    }
  ];

  return (
    <div className="space-y-10 pb-16">
      {/* Hero */}
      <section className="bg-gradient-to-b from-indigo-900 via-indigo-900 to-slate-900 text-white pt-12 pb-16 px-4 sm:px-6 lg:px-8 border-b border-indigo-950 text-center relative overflow-hidden">
        <div className="max-w-5xl mx-auto space-y-6 relative z-10">
          <span className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 px-3 py-1 rounded-full text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Agenda Keanggotaan & Kebersamaan RT
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
            Jadwal & Agenda Kegiatan Warga
          </h1>
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-300 font-normal leading-relaxed">
            Informasi terbuka jadwal kerja bakti, posyandu, musyawarah RT, serta kegiatan sosial warga lingkungan.
          </p>
        </div>
      </section>

      {/* Events Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-indigo-600" /> Agenda Mendatang
            </h2>
            <p className="text-xs text-slate-500 mt-1">Mari berpartisipasi aktif dalam kegiatan kebersamaan lingkungan</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((evt) => (
            <div
              key={evt.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {evt.category}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                    Terjadwal
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 leading-snug">{evt.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{evt.description}</p>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-100 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>{new Date(evt.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} ({evt.time})</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{evt.location}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
