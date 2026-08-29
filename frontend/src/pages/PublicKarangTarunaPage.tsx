import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Flame, Users, Calendar, Award, HeartHandshake } from 'lucide-react';
import { api } from '../services/api';
import { getTenantSlugOrFallback } from '../utils/tenant';

interface PublicMemberItem {
  name: string;
  role: string;
  section?: string;
  custom_title?: string;
  photo_url?: string;
}

interface PublicKTStructureResponse {
  period?: {
    name: string;
    start_date: string;
    end_date: string;
    sk_number?: string;
  };
  members?: PublicMemberItem[];
  data?: {
    period: {
      name: string;
      start_date: string;
      end_date: string;
      sk_number?: string;
    };
    core_members: {
      resident_name?: string;
      role: string;
      section?: string;
      custom_title?: string;
      photo_url?: string;
    }[];
    sections: {
      section: string;
      members: {
        resident_name?: string;
        role: string;
        section?: string;
        custom_title?: string;
        photo_url?: string;
      }[];
    }[];
  } | null;
  message?: string;
}

export function usePublicKarangTarunaQuery() {
  const slug = getTenantSlugOrFallback();
  return useQuery({
    queryKey: ['public-karang-taruna', slug],
    queryFn: async () => {
      const res = await api.get<PublicKTStructureResponse>(`/t/${slug}/karang-taruna`);
      return res.data;
    },
    staleTime: 60_000,
  });
}

export const PublicKarangTarunaPage: React.FC = () => {
  const { data, isLoading, error } = usePublicKarangTarunaQuery();

  const period = data?.period || data?.data?.period;

  const normalizedMembers: PublicMemberItem[] = React.useMemo(() => {
    if (data?.members && data.members.length > 0) {
      return data.members;
    }
    const result: PublicMemberItem[] = [];
    if (data?.data?.core_members) {
      data.data.core_members.forEach((m) => {
        result.push({
          name: m.resident_name || 'Pemuda RT',
          role: m.role,
          section: m.section,
          custom_title: m.custom_title,
          photo_url: m.photo_url,
        });
      });
    }
    if (data?.data?.sections) {
      data.data.sections.forEach((sec) => {
        sec.members.forEach((m) => {
          result.push({
            name: m.resident_name || 'Anggota Seksi',
            role: m.role,
            section: sec.section,
            custom_title: m.custom_title,
            photo_url: m.photo_url,
          });
        });
      });
    }
    return result;
  }, [data]);

  const coreMembers = normalizedMembers.filter((m) => !m.section || m.section === '');
  const sectionMembers = normalizedMembers.filter((m) => Boolean(m.section && m.section !== ''));

  const sectionsGrouped: Record<string, PublicMemberItem[]> = {};
  sectionMembers.forEach((m) => {
    const sec = m.section || 'Lainnya';
    if (!sectionsGrouped[sec]) sectionsGrouped[sec] = [];
    sectionsGrouped[sec].push(m);
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 opacity-10 pointer-events-none">
          <Flame className="w-64 h-64 text-indigo-400" />
        </div>
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
            <Flame className="w-3.5 h-3.5" /> Kepemudaan &amp; Kreativitas
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Karang Taruna Lingkungan
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
            Wadah pengembangan generasi muda, aksi sosial kepedulian warga, olahraga, pelestarian lingkungan, dan pengelolaan Bank Sampah RT.
          </p>

          {period && (
            <div className="pt-2 flex items-center gap-4 text-xs text-indigo-200">
              <span className="flex items-center gap-1.5 font-semibold bg-indigo-800/60 px-3 py-1 rounded-lg border border-indigo-700/50">
                <Calendar className="w-3.5 h-3.5" /> Masa Bakti: {period.name} ({new Date(period.start_date).getFullYear()} - {new Date(period.end_date).getFullYear()})
              </span>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-40 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
        </div>
      ) : error || !period ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Kepengurusan Belum Dipublikasikan</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Struktur organisasi Karang Taruna untuk periode saat ini sedang dalam proses pembentukan atau belum disetujui pengurus RT.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Pengurus Inti */}
          <section aria-label="Pengurus Inti" className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h2 className="text-base font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-600" /> Pengurus Inti
              </h2>
              <span className="text-xs text-slate-400 font-semibold">{coreMembers.length} Pemuda</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {coreMembers.map((member, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4"
                >
                  <div className="w-14 h-14 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shrink-0 font-extrabold text-lg overflow-hidden">
                    {member.photo_url ? (
                      <img src={member.photo_url} alt={member.name} className="w-full h-full object-cover" />
                    ) : (
                      (member.name || 'P').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-indigo-50 text-indigo-700 border border-indigo-200 mb-1">
                      {member.custom_title || member.role.replace(/_/g, ' ')}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 truncate">{member.name || 'Pemuda RT'}</h3>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Seksi-Seksi Bidang */}
          {Object.entries(sectionsGrouped).length > 0 && (
            <section aria-label="Seksi Bidang" className="space-y-6">
              <div className="border-b border-slate-200 pb-2">
                <h2 className="text-base font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" /> Seksi &amp; Divisi Kerja
                </h2>
              </div>

              <div className="space-y-6">
                {Object.entries(sectionsGrouped).map(([sectionName, sMembers]) => (
                  <div key={sectionName} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
                    <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-wide flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-600" /> Seksi {sectionName.replace(/_/g, ' ')}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                      {sMembers.map((m, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0 overflow-hidden">
                            {m.photo_url ? (
                              <img src={m.photo_url} alt={m.name} className="w-full h-full object-cover" />
                            ) : (
                              (m.name || 'P').charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{m.name || 'Anggota Seksi'}</p>
                            <p className="text-[10px] text-slate-500 capitalize">{m.custom_title || m.role.replace(/_/g, ' ')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Program Kolaborasi & Bank Sampah Preview */}
          <section className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-6 space-y-3">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm uppercase tracking-wide">
              <HeartHandshake className="w-4 h-4 text-emerald-700" /> Program Aktif Karang Taruna
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="bg-white p-4 rounded-lg border border-emerald-100 shadow-sm space-y-1">
                <p className="text-xs font-bold text-slate-800">1. Pengelolaan Bank Sampah Warga</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Karang Taruna memfasilitasi penimbangan sampah anorganik terpilah per KK. Hasil penjualan dibagi adil: tabungan/pembayaran warga + kas kepemudaan.
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-emerald-100 shadow-sm space-y-1">
                <p className="text-xs font-bold text-slate-800">2. Aksi Sosial &amp; Hari Besar Lingkungan</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Pelaksanaan peringatan 17 Agustus, kerja bakti berkala, dan pendampingan santunan kemanusiaan.
                </p>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
export default PublicKarangTarunaPage;