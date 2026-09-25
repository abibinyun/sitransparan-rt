import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Award,
  Layers,
  FileCheck,
  ShieldCheck,
  Flame
} from 'lucide-react';
import { api } from '../services/api';
import { getTenantSlugOrFallback } from '../utils/tenant';
import { usePublicRTStructureQuery } from '../services/rt_structure';

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
    staleTime: 0,
  });
}

export const PublicKarangTarunaPage: React.FC = () => {
  const [activeOrgTab, setActiveOrgTab] = useState<'rt' | 'kt'>('rt');
  const { data: rtData, isLoading: isRTLoading } = usePublicRTStructureQuery();
  const { data, isLoading, error } = usePublicKarangTarunaQuery();

  const rtPeriod = rtData?.period;
  const rtMembers = (rtData?.members as any) || [];
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
    <div className="pb-16 space-y-8 bg-[#f5f5f7] text-[#1d1d1f] min-h-screen">
      {/* Hero Section Apple */}
      <section className="bg-white text-[#1d1d1f] px-4 sm:px-6 py-12 sm:py-16 border-b border-[#d2d2d7]">
        <div className="max-w-6xl mx-auto space-y-4">
          <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight leading-tight text-[#1d1d1f]">
            Struktur Organisasi &amp; Kepemudaan
          </h1>
          <p className="max-w-2xl text-xs sm:text-sm text-[#707070] leading-relaxed font-normal">
            Keterbukaan susunan pejabat pengurus RT/RW resmi dan wadah kreasi pemuda Karang Taruna lingkungan.
          </p>

          {/* Tab Filter: Pengurus RT/RW vs Karang Taruna */}
          <div className="pt-4 flex items-center gap-2">
            <button
              onClick={() => setActiveOrgTab('rt')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition ${
                activeOrgTab === 'rt'
                  ? 'bg-[#1d1d1f] text-white shadow-xs'
                  : 'bg-white text-[#707070] border border-[#d2d2d7] hover:text-[#1d1d1f]'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#0071e3]" /> 1. Pengurus RT/RW ({rtMembers.length})
            </button>
            <button
              onClick={() => setActiveOrgTab('kt')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition ${
                activeOrgTab === 'kt'
                  ? 'bg-[#1d1d1f] text-white shadow-xs'
                  : 'bg-white text-[#707070] border border-[#d2d2d7] hover:text-[#1d1d1f]'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-600" /> 2. Karang Taruna ({normalizedMembers.length})
            </button>
          </div>

          {/* Period Banner if Available */}
          {activeOrgTab === 'rt' && rtPeriod && (
            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-[#1d1d1f]">
              <span className="flex items-center gap-1.5 bg-[#f4f8fb] border border-[#d2d2d7] px-3 py-1 rounded-full text-[#0066cc] font-medium">
                <ShieldCheck className="w-4 h-4 text-[#0071e3]" /> Periode: {rtPeriod.name}
              </span>
              {rtPeriod.sk_number && (
                <span className="flex items-center gap-1.5 bg-[#f5f5f7] border border-[#d2d2d7] px-3 py-1 rounded-full text-[#707070] font-normal">
                  <FileCheck className="w-4 h-4 text-emerald-600" /> SK: {rtPeriod.sk_number}
                </span>
              )}
            </div>
          )}
          {activeOrgTab === 'kt' && period && (
            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-[#1d1d1f]">
              <span className="flex items-center gap-1.5 bg-[#f4f8fb] border border-[#d2d2d7] px-3 py-1 rounded-full text-[#0066cc] font-medium">
                <Award className="w-4 h-4 text-[#0071e3]" /> Periode: {period.name}
              </span>
              {period.sk_number && (
                <span className="flex items-center gap-1.5 bg-[#f5f5f7] border border-[#d2d2d7] px-3 py-1 rounded-full text-[#707070] font-normal">
                  <FileCheck className="w-4 h-4 text-emerald-600" /> SK: {period.sk_number}
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-10">
        {/* VIEW 1: STRUKTUR PENGURUS RT/RW RESMI */}
        {activeOrgTab === 'rt' && (
          <div>
            {isRTLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 rounded-xl bg-[#e2e2e5] animate-pulse" />
                ))}
              </div>
            ) : rtMembers.length === 0 ? (
              <div className="apple-card p-12 text-center space-y-3">
                <ShieldCheck className="w-10 h-10 text-[#858585] mx-auto" />
                <h3 className="font-semibold text-base text-[#1d1d1f]">Susunan Pengurus RT Belum Ditetapkan</h3>
                <p className="text-xs text-[#707070] max-w-md mx-auto">
                  Pengurus RT belum mempublikasikan SK dan susunan kepengurusan masa bakti resmi saat ini.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="flex items-center gap-2 border-b border-[#d2d2d7] pb-3">
                  <ShieldCheck className="w-4 h-4 text-[#0071e3]" />
                  <h2 className="text-base sm:text-lg font-semibold text-[#1d1d1f]">Susunan Pejabat Pengurus RT/RW</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {rtMembers.map((m: any, idx: number) => (
                    <div
                      key={idx}
                      className="apple-card p-5 space-y-3 text-center flex flex-col items-center justify-center hover:border-[#0071e3] transition-colors"
                    >
                      <div className="w-16 h-16 rounded-full bg-[#f4f8fb] border border-[#d2d2d7] flex items-center justify-center text-[#0066cc] font-semibold text-lg overflow-hidden shadow-xs">
                        {m.photo_url ? (
                          <img src={m.photo_url} alt={m.name} className="w-full h-full object-cover" />
                        ) : (
                          (m.name || 'W').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-[#1d1d1f]">{m.name}</h4>
                        <p className="text-xs text-[#0066cc] font-medium mt-0.5">
                          {m.custom_title || (m.role === 'ketua' ? 'Ketua RT' : m.role === 'wakil' ? 'Wakil Ketua' : m.role === 'sekretaris' ? 'Sekretaris' : m.role === 'bendahara' ? 'Bendahara' : m.section ? `Seksi ${m.section}` : 'Pengurus RT')}
                        </p>
                        {m.section && !m.custom_title && (
                          <span className="text-[10px] text-[#707070] block mt-0.5">Bidang {m.section}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: KARANG TARUNA & PEMUDA */}
        {activeOrgTab === 'kt' && (
          <div>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-40 rounded-lg bg-[#e2e2e5] animate-pulse" />
                ))}
              </div>
            ) : error || normalizedMembers.length === 0 ? (
          <div className="apple-card p-12 text-center space-y-3">
            <Users className="w-10 h-10 text-[#858585] mx-auto" />
            <h3 className="font-semibold text-base text-[#1d1d1f]">Susunan Pengurus Belum Ditetapkan</h3>
            <p className="text-xs text-[#707070] max-w-md mx-auto">
              Pengurus RT dan perwakilan pemuda belum mempublikasikan SK dan struktur kepengurusan Karang Taruna aktif saat ini.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Pengurus Inti */}
            {coreMembers.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-b border-[#d2d2d7] pb-3">
                  <Award className="w-4 h-4 text-[#0071e3]" />
                  <h2 className="text-base sm:text-lg font-semibold text-[#1d1d1f]">Pengurus Inti Karang Taruna</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {coreMembers.map((m, idx) => (
                    <div
                      key={idx}
                      className="apple-card p-5 space-y-3 text-center flex flex-col items-center justify-center hover:border-[#0071e3] transition-colors"
                    >
                      <div className="w-16 h-16 rounded-full bg-[#f4f8fb] border border-[#d2d2d7] flex items-center justify-center text-[#0066cc] font-semibold text-lg overflow-hidden shadow-xs">
                        {m.photo_url ? (
                          <img src={m.photo_url} alt={m.name} className="w-full h-full object-cover" />
                        ) : (
                          m.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-[#1d1d1f]">{m.name}</h4>
                        <p className="text-xs text-[#0066cc] font-medium mt-0.5">{m.custom_title || m.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Seksi-Seksi Bidang */}
            {Object.keys(sectionsGrouped).length > 0 && (
              <section className="space-y-6">
                <div className="flex items-center gap-2 border-b border-[#d2d2d7] pb-3">
                  <Layers className="w-4 h-4 text-[#0071e3]" />
                  <h2 className="text-base sm:text-lg font-semibold text-[#1d1d1f]">Seksi Bidang &amp; Koordinator Kerja</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(sectionsGrouped).map(([sectionName, members]) => (
                    <div key={sectionName} className="apple-card p-5 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-[#d2d2d7]">
                        <h3 className="font-semibold text-sm text-[#1d1d1f] flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#0071e3]" />
                          {sectionName}
                        </h3>
                        <span className="text-[11px] font-normal text-[#707070]">
                          {members.length} anggota
                        </span>
                      </div>

                      <div className="space-y-2">
                        {members.map((m, idx) => (
                          <div
                            key={idx}
                            className="apple-card p-4 flex items-center gap-3 hover:border-[#0071e3] transition-colors"
                          >
                            <div className="w-10 h-10 rounded-full bg-[#f4f8fb] border border-[#d2d2d7] flex items-center justify-center text-[#0066cc] font-medium text-sm overflow-hidden shrink-0 shadow-xs">
                              {m.photo_url ? (
                                <img src={m.photo_url} alt={m.name} className="w-full h-full object-cover" />
                              ) : (
                                m.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-medium text-xs text-[#1d1d1f] truncate">{m.name}</h4>
                              <p className="text-[11px] text-[#707070] truncate mt-0.5">{m.custom_title || m.role}</p>
                            </div>
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
        )}
      </div>
    </div>
  );
};

export default PublicKarangTarunaPage;
