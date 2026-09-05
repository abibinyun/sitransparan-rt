import React, { useState } from 'react';
import { usePublicAnnouncements, usePublicDocuments } from '../services/announcement_doc';
import { usePublicTenantQuery } from '../services/public_tenant';
import { ShareCardModal, ShareableAnnouncement } from '../components/ShareCardModal';
import { KasSummaryWidget } from '../components/KasSummaryWidget';
import { MeetingDecisionsWidget } from '../components/MeetingDecisionsWidget';
import { ReactionButton } from '../components/ReactionButton';
import { PollWidget } from '../components/PollWidget';
import { MediaCarousel } from '../components/MediaCarousel';
import { ParticipationCard } from '../components/ParticipationCard';
import { enablePushNotifications, checkPushSubscriptionActive } from '../services/push';
import axios from 'axios';
import { getTenantSlugOrFallback } from '../utils/tenant';
import { getFileUrl } from '../utils/file';
import {
  FileText,
  Download,
  Search,
  Megaphone,
  Calendar,
  AlertCircle,
  FileCheck,
  Share2,
  Bell,
  BellRing,
  Check
} from 'lucide-react';

export const PublicAnnouncementsPage: React.FC = () => {
  const { data: announcementsData, isLoading: loadingAnnouncements } = usePublicAnnouncements();
  const { data: documentsData, isLoading: loadingDocuments } = usePublicDocuments();
  const { data: tenantInfo } = usePublicTenantQuery();
  const tenantName = tenantInfo?.name || 'Portal RT';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [shareTarget, setShareTarget] = useState<ShareableAnnouncement | null>(null);
  const [pushStatus, setPushStatus] = useState<'idle' | 'loading' | 'enabled' | 'error'>(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      return 'enabled';
    }
    return 'idle';
  });
  const [pushErrorMsg, setPushErrorMsg] = useState<string>('');

  React.useEffect(() => {
    let isMounted = true;
    checkPushSubscriptionActive().then((isActive) => {
      if (isMounted) {
        if (isActive) {
          setPushStatus('enabled');
        } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          // Izin browser granted, namun subscription belum tercatat di PushManager/SW
          setPushStatus('enabled');
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleEnablePush = async () => {
    setPushStatus('loading');
    setPushErrorMsg('');
    const res = await enablePushNotifications();
    if (res.ok) {
      setPushStatus('enabled');
    } else {
      setPushStatus('error');
      setPushErrorMsg(res.reason || 'Gagal mengaktifkan notifikasi');
    }
  };

  // KPI: catat feed_view sekali per kunjungan halaman
  React.useEffect(() => {
    axios.post(`/api/v1/t/${getTenantSlugOrFallback()}/events`, { event_type: 'feed_view' }).catch(() => {});
  }, []);

  const openShare = (item: ShareableAnnouncement) => {
    setShareTarget(item);
    axios
      .post(`/api/v1/t/${getTenantSlugOrFallback()}/events`, { event_type: 'share_opened', target_id: (item as any).id })
      .catch(() => {});
  };

  const announcements = announcementsData?.data || [];
  const documents = documentsData?.data || [];

  const filteredAnnouncements = announcements.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || doc.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="pb-16">
      {/* Hero Section Civic */}
      <section className="bg-slate-900 text-white px-4 sm:px-6 py-10 sm:py-14 border-b border-slate-800">
        <div className="max-w-6xl mx-auto space-y-5">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold px-3 py-1 rounded-full">
            <Megaphone className="w-3.5 h-3.5" /> Saluran Komunikasi Resmi
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Pengumuman &amp; Dokumen Transparansi Warga
          </h1>
          <p className="max-w-2xl text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
            Edaran resmi pengurus {tenantName}, arsip notula musyawarah, dan keterbukaan kas lingkungan tanpa perantara.
          </p>

          {/* Search bar */}
          <div className="relative max-w-xl">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" aria-hidden />
            <input
              type="text"
              placeholder="Cari kabar, edaran, atau berkas RT..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Cari kabar atau berkas RT"
              className="w-full bg-white text-slate-900 placeholder-slate-400 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>
      </section>

      {/* Grid Konten: Feed Utama di Kiri, Kas & Partisipasi di Rel Kanan */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Sidebar Kanan (Desktop) / Atas (Mobile) */}
        <aside className="space-y-6 lg:order-2" aria-label="Ringkasan transparansi">
          {/* Card Notifikasi Langsung */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 space-y-3 shadow-xs">
            <div className="flex items-center gap-3 text-emerald-950 font-bold text-sm">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="leading-snug">Notifikasi Pengumuman</h3>
                <p className="text-[11px] font-normal text-emerald-800">Dapatkan broadcast langsung di HP Anda</p>
              </div>
            </div>
            <button
              onClick={handleEnablePush}
              disabled={pushStatus === 'loading' || pushStatus === 'enabled'}
              className="w-full inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all shadow-xs disabled:opacity-80"
            >
              {pushStatus === 'enabled' ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" /> Notifikasi Aktif
                </>
              ) : pushStatus === 'loading' ? (
                <>
                  <BellRing className="w-4 h-4 animate-spin" /> Mendaftarkan...
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4" /> Aktifkan di Perangkat Ini
                </>
              )}
            </button>
            {pushErrorMsg && (
              <p className="text-[11px] text-rose-700 font-medium text-center bg-rose-50 border border-rose-200 rounded-lg p-2">
                {pushErrorMsg}
              </p>
            )}
          </div>

          {/* Widget Kas Lingkungan Terbuka */}
          <KasSummaryWidget />

          {/* Widget Partisipasi & Lencana Warga */}
          <ParticipationCard />

          {/* Widget Notula Musyawarah */}
          <MeetingDecisionsWidget />
        </aside>

        {/* Feed Utama: Pengumuman & Dokumen */}
        <div className="space-y-10 min-w-0 lg:order-1">
          {/* Widget Polling Terbuka Warga */}
          <PollWidget />

          {/* Section Pengumuman Terbaru */}
          <section className="space-y-5" aria-label="Daftar Pengumuman">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <h2 className="text-lg font-extrabold text-slate-900">Kabar &amp; Edaran Pengurus</h2>
              </div>
              <span className="text-xs font-semibold text-slate-500 tabular-nums">
                {filteredAnnouncements.length} edaran
              </span>
            </div>

            {loadingAnnouncements ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-44 rounded-2xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : filteredAnnouncements.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center space-y-2 bg-white">
                <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="font-bold text-sm text-slate-700">Belum Ada Pengumuman</p>
                <p className="text-xs text-slate-500">Kabar terbaru dari pengurus RT akan muncul di sini.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {filteredAnnouncements.map((item) => (
                  <article
                    key={item.id}
                    className="civic-card p-5 sm:p-6 space-y-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-100">
                          <Megaphone className="w-3 h-3 text-emerald-600" /> {item.target === 'residents_only' ? 'Warga RT' : 'Umum'}
                        </span>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                          {item.title}
                        </h3>
                      </div>
                      <button
                        onClick={() => openShare(item)}
                        className="p-2 rounded-xl text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                        aria-label="Bagikan ke WhatsApp"
                        title="Buat Kartu Share WhatsApp"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Konten teks */}
                    <div className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {item.content}
                    </div>

                    {/* Media foto (attachment_url gambar + media_urls) */}
                    {(() => {
                      const isImage = (url: string) => /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(url) || url.includes('/proofs/') || url.includes('/files/');
                      const allPhotos: string[] = [];
                      if (item.attachment_url && isImage(item.attachment_url)) {
                        allPhotos.push(item.attachment_url);
                      }
                      if (item.media_urls && item.media_urls.length > 0) {
                        item.media_urls.forEach((u) => {
                          if (!allPhotos.includes(u)) allPhotos.push(u);
                        });
                      }

                      return (
                        <>
                          {allPhotos.length > 0 && (
                            <div className="pt-2">
                              <MediaCarousel urls={allPhotos} alt={item.title} />
                            </div>
                          )}

                          {/* Jika attachment berupa dokumen/PDF non-gambar */}
                          {item.attachment_url && !isImage(item.attachment_url) && (
                            <div className="pt-2">
                              <a
                                href={getFileUrl(item.attachment_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors"
                              >
                                <FileText className="w-3.5 h-3.5" /> Unduh Dokumen Lampiran
                              </a>
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {/* Footer kartu: Tanggal & Reaksi Sosial Warga */}
                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(item.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>

                      {/* Reaksi Gotong Royong Warga */}
                      <ReactionButton targetType="announcement" targetId={item.id} />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* Section Dokumen & Notula Transparansi */}
          <section className="space-y-5 pt-6 border-t border-slate-200/80" aria-label="Dokumen Publik">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-700" />
                <h2 className="text-lg font-extrabold text-slate-900">Arsip &amp; Dokumen Warga</h2>
              </div>

              {/* Filter Kategori Dokumen */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
                {['ALL', 'financial_report', 'minutes', 'letter', 'other'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                      selectedCategory === cat
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {cat === 'ALL' ? 'Semua Berkas' : cat.replace('_', ' ').toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {loadingDocuments ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center bg-white space-y-1">
                <FileText className="w-7 h-7 text-slate-400 mx-auto" />
                <p className="font-bold text-xs text-slate-700">Tidak ada dokumen pada kategori ini</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="civic-card p-4 sm:p-5 flex flex-col justify-between hover:shadow-sm transition-all"
                  >
                    <div className="space-y-2">
                      <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold uppercase tracking-wider">
                        {doc.category.replace('_', ' ')}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900 leading-snug line-clamp-2">
                        {doc.title}
                      </h4>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(doc.created_at).toLocaleDateString('id-ID')}
                      </span>
                      <a
                        href={getFileUrl(doc.file_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200/60"
                      >
                        <Download className="w-3.5 h-3.5" /> Unduh Dokumen
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Modal Share Generator WhatsApp */}
      {shareTarget && (
        <ShareCardModal
          announcement={shareTarget}
          tenantName={tenantName}
          isOpen={Boolean(shareTarget)}
          onClose={() => setShareTarget(null)}
        />
      )}
    </div>
  );
};
