import React, { useState } from 'react';
import { usePublicAnnouncements, usePublicDocuments } from '../services/announcement_doc';
import { usePublicTenantQuery } from '../services/public_tenant';
import { ShareCardModal, ShareableAnnouncement } from '../components/ShareCardModal';
import { KasSummaryWidget } from '../components/KasSummaryWidget';
import { MeetingDecisionsWidget } from '../components/MeetingDecisionsWidget';
import { ReactionButton } from '../components/ReactionButton';
import { PollWidget } from '../components/PollWidget';
import {
  FileText,
  Download,
  Search,
  Megaphone,
  Calendar,
  AlertCircle,
  FileCheck,
  ArrowUpRight,
  Share2,
  Users
} from 'lucide-react';

export const PublicAnnouncementsPage: React.FC = () => {
  const { data: announcementsData, isLoading: loadingAnnouncements } = usePublicAnnouncements();
  const { data: documentsData, isLoading: loadingDocuments } = usePublicDocuments();
  const { data: tenantInfo } = usePublicTenantQuery();
  const tenantName = tenantInfo?.name || 'Portal RT';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [shareTarget, setShareTarget] = useState<ShareableAnnouncement | null>(null);

  const announcements = announcementsData?.data || [];
  const documents = documentsData?.data || [];

  const filteredAnnouncements = announcements.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || doc.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="pb-16">
      {/* Kepala halaman: left-aligned, solid, tanpa gradien */}
      <section className="bg-slate-900 text-white px-4 sm:px-6 py-10">
        <div className="max-w-6xl mx-auto space-y-5">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
            Pengumuman &amp; Dokumen Transparansi
          </h1>
          <p className="max-w-2xl text-sm text-slate-300 leading-relaxed">
            Edaran resmi pengurus, keputusan musyawarah, dan laporan kas — terbuka untuk
            seluruh warga. Ditagih langsung dari sistem, tanpa perantara.
          </p>
          <div className="relative max-w-xl">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" aria-hidden />
            <input
              type="text"
              placeholder="Cari pengumuman atau dokumen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Cari pengumuman atau dokumen"
              className="w-full bg-white text-slate-900 placeholder-slate-400 border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm"
            />
          </div>
        </div>
      </section>

      {/* Konten: feed di kiri, ringkasan kas & musyawarah di rel kanan (desktop).
          Di ponsel, kas & musyawarah tampil lebih dulu. */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <aside className="space-y-6 lg:order-2" aria-label="Ringkasan transparansi">
          <KasSummaryWidget />
          <PollWidget />
          <MeetingDecisionsWidget />
        </aside>

        <div className="space-y-12 lg:order-1 min-w-0">
          {/* Timeline pengumuman — satu kolom, bobot mengikuti isi */}
          <section aria-label="Pengumuman" className="space-y-5">
            <div className="flex items-baseline justify-between gap-4 border-b border-slate-200 pb-3">
              <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
                <Megaphone className="w-5 h-5 text-emerald-700" /> Pengumuman Pengurus
              </h2>
              <span className="text-xs font-semibold text-slate-500 tabular-nums">
                {filteredAnnouncements.length} tulisan
              </span>
            </div>

            {loadingAnnouncements ? (
              <div className="space-y-4">
                {[1, 2].map((n) => (
                  <div key={n} className="h-36 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : filteredAnnouncements.length ? (
              <div className="space-y-4">
                {filteredAnnouncements.map((item) => {
                  const official = item.target === 'all';
                  return (
                    <article
                      key={item.id}
                      className={`bg-white rounded-xl border p-5 sm:p-6 space-y-3 ${
                        official ? 'border-slate-200 border-l-4 border-l-emerald-700' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        {official ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                            <Megaphone className="w-3.5 h-3.5" /> Pengumuman Resmi
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            <Users className="w-3.5 h-3.5" /> Khusus Warga
                          </span>
                        )}
                        <span className="text-xs text-slate-400 tabular-nums">
                          {new Date(item.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 leading-snug">{item.title}</h3>
                      <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed line-clamp-4">
                        {item.content}
                      </p>

                      {item.attachment_url && (
                        <div className="pt-1">
                          <a
                            href={item.attachment_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg"
                          >
                            <Download className="w-3.5 h-3.5" /> Unduh Lampiran
                          </a>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <ReactionButton targetType="announcement" targetId={item.id} />
                        <button
                          onClick={() => setShareTarget(item)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg"
                        >
                          <Share2 className="w-3.5 h-3.5" /> Bagikan ke WhatsApp
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="border border-dashed border-slate-300 rounded-xl p-10 text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">Belum Ada Pengumuman</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Pengumuman dari pengurus RT akan tampil di sini.
                </p>
              </div>
            )}
          </section>

          {/* Arsip dokumen */}
          <section aria-label="Arsip dokumen" className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
                <FileCheck className="w-5 h-5 text-emerald-700" /> Arsip Dokumen
              </h2>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                {['ALL', 'Keuangan', 'Notulen', 'Peraturan'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${
                      selectedCategory === cat
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {cat === 'ALL' ? 'Semua' : cat}
                  </button>
                ))}
              </div>
            </div>

            {loadingDocuments ? (
              <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
            ) : filteredDocuments.length ? (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                {filteredDocuments.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between gap-4 px-5 py-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                          {doc.category || 'Dokumen'}
                        </span>
                        <span className="text-[11px] text-slate-400 tabular-nums">
                          {new Date(doc.created_at).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                      <h4 className="mt-1 text-sm font-bold text-slate-900 leading-snug">{doc.title}</h4>
                    </div>
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Buka dokumen ${doc.title}`}
                      className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 px-3 py-2 rounded-lg"
                    >
                      <FileText className="w-4 h-4" /> Buka <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="border border-dashed border-slate-300 rounded-xl p-10 text-center space-y-2">
                <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">Belum Ada Dokumen</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Dokumen transparansi dari pengurus RT akan tersedia di sini.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>

      <ShareCardModal
        isOpen={shareTarget !== null}
        onClose={() => setShareTarget(null)}
        announcement={shareTarget}
        tenantName={tenantName}
      />
    </div>
  );
};
