import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Flame,
  Users,
  Award,
  Layers,
  FileCheck
} from 'lucide-react';
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
  const sectionMembers = normalizedMembers.filter((m) => Boolean(m.section));

  const sectionsGrouped: Record<string, PublicMemberItem[]> = {};
  sectionMembers.forEach((m) => {
    const sec = m.section || 'Lainnya';
    if (!sectionsGrouped[sec]) {
      sectionsGrouped[sec] = [];
    }
    sectionsGrouped[sec].push(m);
  });

  return (
    <div className="pb-16 space-y-8">
      {/* Hero Section */}
      <section className="bg-slate-900 text-white px-4 sm:px-6 py-10 sm:py-14 border-b border-slate-800">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 text-xs font-semibold px-3 py-1 rounded-full">
            <Flame className="w-3.5 h-3.5 text-indigo-400" /> Energi Generasi Muda
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Karang Taruna &amp; Kepemudaan Lingkungan
          </h1>
          <p className="max-w-2xl text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
            Struktur kepengurusan resmi, program kerja pemuda, kegiatan olahraga, sosial kemasyarakatan, serta inovasi Bank Sampah lingkungan.
          </p>

          {/* Period Banner if Available */}
          {period && (
            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-indigo-200">
              <span className="flex items-center gap-1.5 bg-indigo-950/80 border border-indigo-800/80 px-3 py-1.5 rounded-xl">
                <Award className="w-4 h-4 text-indigo-400" /> Periode: {period.name}
              </span>
              {period.sk_number && (
                <span className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl text-slate-300">
                  <FileCheck className="w-4 h-4 text-emerald-400" /> SK: {period.sk_number}
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-10">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : error || normalizedMembers.length === 0 ? (
          <div className="civic-card p-12 text-center space-y-3">
            <Users className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="font-bold text-base text-slate-800">Susunan Pengurus Belum Ditetapkan</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Pengurus RT dan perwakilan pemuda belum mempublikasikan SK dan struktur kepengurusan Karang Taruna aktif saat ini.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Pengurus Inti */}
            {coreMembers.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                  <Award className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-lg font-extrabold text-slate-900">Pengurus Inti Karang Taruna</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {coreMembers.map((m, idx) => (
                    <div
                      key={idx}
                      className="civic-card p-5 space-y-3 text-center flex flex-col items-center justify-center hover:border-indigo-300 transition-all"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-extrabold text-lg overflow-hidden shadow-xs">
                        {m.photo_url ? (
                          <img src={m.photo_url} alt={m.name} className="w-full h-full object-cover" />
                        ) : (
                          m.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900">{m.name}</h4>
                        <p className="text-xs font-bold text-indigo-600 mt-0.5">{m.custom_title || m.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Seksi-Seksi Bidang */}
            {Object.keys(sectionsGrouped).length > 0 && (
              <section className="space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                  <Layers className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-lg font-extrabold text-slate-900">Seksi Bidang &amp; Koordinator Kerja</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {Object.entries(sectionsGrouped).map(([sectionName, members]) => (
                    <div key={sectionName} className="civic-card p-5 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          {sectionName}
                        </h3>
                        <span className="text-[11px] font-bold text-slate-400">
                          {members.length} anggota
                        </span>
                      </div>

                      <div className="space-y-2">
                        {members.map((m, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 transition-colors"
                          >
                            <span className="text-xs font-bold text-slate-800">{m.name}</span>
                            <span className="text-[11px] font-medium text-slate-500">
                              {m.custom_title || m.role}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicKarangTarunaPage;
