import React, { useState } from 'react';
import { usePublicAnnouncements, usePublicDocuments } from '../services/announcement_doc';
import {
  FileText,
  Download,
  Search,
  Megaphone,
  Calendar,
  AlertCircle,
  FileCheck,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';

export const PublicAnnouncementsPage: React.FC = () => {
  const { data: announcementsData, isLoading: loadingAnnouncements } = usePublicAnnouncements();
  const { data: documentsData, isLoading: loadingDocuments } = usePublicDocuments();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

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
    <div className="space-y-10 pb-16">
      {/* Hero Banner Section */}
      <section className="bg-gradient-to-b from-indigo-900 via-indigo-900 to-slate-900 text-white pt-12 pb-16 px-4 sm:px-6 lg:px-8 border-b border-indigo-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto space-y-6 relative z-10 text-center">
          <span className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 px-3 py-1 rounded-full text-xs font-semibold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Keterbukaan Informasi Warga RT
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
            Pengumuman & Dokumen Transparansi RT
          </h1>
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-300 font-normal leading-relaxed">
            Akses langsung edaran resmi pengurus RT, notulen rapat, serta laporan pertanggungjawaban keuangan secara transparan & akuntabel.
          </p>

          {/* Search Box */}
          <div className="max-w-xl mx-auto pt-4">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-4 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari pengumuman, surat edaran, atau dokumen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/10 backdrop-blur-md text-white placeholder-slate-400 border border-white/20 rounded-2xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white/15 transition-all shadow-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section 1: Pengumuman Terbaru */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-indigo-600" /> Pengumuman Resmi Pengurus
              </h2>
              <p className="text-xs text-slate-500 mt-1">Informasi dan edaran terkini untuk seluruh warga lingkungan</p>
            </div>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100 self-start sm:self-auto">
              {filteredAnnouncements.length} Pengumuman Aktif
            </span>
          </div>

          {loadingAnnouncements ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2].map((n) => (
                <div key={n} className="h-44 bg-slate-100 animate-pulse rounded-2xl border border-slate-200" />
              ))}
            </div>
          ) : filteredAnnouncements.length ? (
            <div className="grid gap-6 md:grid-cols-2">
              {filteredAnnouncements.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {item.target === 'all' ? 'Publik / Warga' : 'Pengurus RT'}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
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
                  </div>

                  {item.attachment_url && (
                    <div className="pt-2 border-t border-slate-100">
                      <a
                        href={item.attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50/60 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" /> Unduh Dokumen Lampiran
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">Belum Ada Pengumuman</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Pengumuman atau edaran terbaru dari pengurus RT akan muncul secara transparan di sini.
              </p>
            </div>
          )}
        </div>

        {/* Section 2: Dokumen & Arsip Transparansi */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-600" /> Arsip Dokumen & Laporan Transparan
              </h2>
              <p className="text-xs text-slate-500 mt-1">Unduh Laporan Keuangan, Notulen Rapat, dan Peraturan RT</p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              {['ALL', 'Keuangan', 'Notulen', 'Peraturan'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {cat === 'ALL' ? 'Semua Dokumen' : cat}
                </button>
              ))}
            </div>
          </div>

          {loadingDocuments ? (
            <div className="h-32 bg-slate-100 animate-pulse rounded-2xl border border-slate-200" />
          ) : filteredDocuments.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                        {doc.category || 'Dokumen'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(doc.created_at).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">{doc.title}</h4>
                  </div>

                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-between w-full text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 px-3.5 py-2.5 rounded-xl transition-colors group"
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" /> Buka Dokumen
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-3">
              <FileText className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">Belum Ada Dokumen</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Dokumen transparansi yang diunggah oleh pengurus RT akan tersedia publik di sini.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
