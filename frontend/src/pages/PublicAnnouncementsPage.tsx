import React, { useState } from 'react';
import { usePublicAnnouncements, usePublicDocuments } from '../services/announcement_doc';
import { usePublicTenantQuery } from '../services/public_tenant';
import { ShareCardModal, ShareableAnnouncement } from '../components/ShareCardModal';
import { AnnouncementDetailModal } from '../components/AnnouncementDetailModal';
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
  const [detailAnnouncement, setDetailAnnouncement] = useState<any | null>(null);
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
    <div className="pb-16 bg-[#f5f5f7] text-[#1d1d1f]">
      {/* Hero Section Apple (Clean Frost Canvas with Apple Blue Accent) */}
      <section className="bg-white text-[#1d1d1f] px-4 sm:px-6 py-12 sm:py-16 border-b border-[#d2d2d7]">
        <div className="max-w-6xl mx-auto space-y-3">
          <div className="apple-badge">
            <Megaphone className="w-3.5 h-3.5 text-[#0071e3]" /> Saluran Komunikasi Resmi
          </div>
          <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight leading-tight text-[#1d1d1f]">
            Pengumuman &amp; Dokumen Transparansi Warga
          </h1>
          <p className="max-w-2xl text-xs sm:text-sm text-[#707070] leading-relaxed font-normal">
            Edaran resmi pengurus {tenantName}, arsip notula musyawarah, dan keterbukaan kas lingkungan tanpa perantara.
          </p>

          {/* Search bar (Apple Form Input Style) */}
          <div className="relative max-w-xl pt-2">
            <Search className="w-4 h-4 absolute left-3.5 top-5 text-[#858585]" aria-hidden />
            <input
              type="text"
              placeholder="Cari kabar, edaran, atau berkas RT..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Cari kabar atau berkas RT"
              className="w-full bg-[#f5f5f7] text-[#1d1d1f] placeholder-[#858585] border border-[#d2d2d7] rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#0071e3] focus:bg-white transition-colors"
            />
          </div>
        </div>
      </section>

      {/* Grid Konten: Feed Utama di Kiri, Kas & Partisipasi di Rel Kanan */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Sidebar Kanan (Desktop) / Atas (Mobile) */}
        <aside className="space-y-6 lg:order-2" aria-label="Ringkasan transparansi">
          {/* Card Notifikasi Langsung (Apple Style Card) */}
          <div className="apple-card p-5 space-y-3">
            <div className="flex items-center gap-3 text-[#1d1d1f] font-semibold text-sm">
              <div className="w-9 h-9 rounded-full bg-[#f4f8fb] flex items-center justify-center text-[#0071e3] shrink-0 border border-[#d2d2d7]">
                <Bell className="w-4.5 h-4.5 text-[#0071e3]" />
              </div>
              <div>
                <h3 className="leading-snug">Notifikasi Pengumuman</h3>
                <p className="text-[11px] font-normal text-[#707070]">Dapatkan broadcast langsung di HP Anda</p>
              </div>
            </div>
            <button
              onClick={handleEnablePush}
              disabled={pushStatus === 'loading' || pushStatus === 'enabled'}
              className="w-full inline-flex items-center justify-center gap-2 apple-btn-primary text-xs py-2.5 px-4 disabled:opacity-75"
            >
              {pushStatus === 'enabled' ? (
                <>
                  <Check className="w-4 h-4 text-white" /> Notifikasi Aktif
                </>
              ) : pushStatus === 'loading' ? (
                <>
                  <BellRing className="w-4 h-4 animate-spin text-white" /> Mendaftarkan...
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
              <div className="space-y-4">
                {filteredAnnouncements.map((item) => (
                  <article
                    key={item.id}
                    className="apple-card p-5 sm:p-6 space-y-3.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className="space-y-1.5 cursor-pointer flex-1 group"
                        onClick={() => setDetailAnnouncement(item)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="apple-badge">
                            <Megaphone className="w-2.5 h-2.5 text-[#0071e3]" /> {item.target === 'residents_only' ? 'Warga RT' : 'Umum'}
                          </span>
                          <span className="text-[11px] text-[#707070] font-normal">
                            {new Date(item.created_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-semibold text-[#1d1d1f] leading-snug group-hover:text-[#0071e3] transition-colors">
                          {item.title}
                        </h3>
                      </div>
                      <button
                        onClick={() => openShare(item)}
                        className="p-2 rounded-full text-[#707070] hover:text-[#0071e3] hover:bg-[#f5f5f7] transition-colors shrink-0"
                        aria-label="Bagikan ke WhatsApp"
                        title="Buat Kartu Share WhatsApp"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Konten teks */}
                    <div
                      className="text-xs sm:text-sm text-[#333333] leading-relaxed whitespace-pre-line cursor-pointer"
                      onClick={() => setDetailAnnouncement(item)}
                    >
                      {item.content.length > 280 ? `${item.content.slice(0, 280)}... ` : item.content}
                      {item.content.length > 280 && (
                        <span className="text-[#0066cc] font-medium inline-block hover:underline ml-1">
                          Lihat Selengkapnya &rarr;
                        </span>
                      )}
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

                      // Kumpulkan berkas dokumen
                      const allFiles: string[] = [];
                      if (item.attachment_url && !isImage(item.attachment_url)) {
                        allFiles.push(item.attachment_url);
                      }
                      if (item.file_urls && item.file_urls.length > 0) {
                        item.file_urls.forEach((f) => {
                          if (!allFiles.includes(f)) allFiles.push(f);
                        });
                      }

                      return (
                        <div className="space-y-2">
                          {allPhotos.length > 0 && (
                            <div className="pt-2 cursor-pointer" onClick={() => setDetailAnnouncement(item)}>
                              <MediaCarousel urls={allPhotos} alt={item.title} />
                            </div>
                          )}

                          {/* Lampiran berkas dokumen / PDF multi */}
                          {allFiles.length > 0 && (
                            <div className="pt-1 flex flex-wrap gap-2">
                              {allFiles.map((fileUrl, fIdx) => (
                                <a
                                  key={fIdx}
                                  href={getFileUrl(fileUrl)}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors"
                                >
                                  <FileText className="w-3.5 h-3.5 text-emerald-600" /> Unduh Dokumen {allFiles.length > 1 ? `#${fIdx + 1}` : 'Lampiran'}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
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
          <section className="space-y-5 pt-6 border-t border-[#d2d2d7]" aria-label="Dokumen Publik">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-[#0071e3]" />
                <h2 className="text-xl font-semibold tracking-tight text-[#1d1d1f]">Arsip &amp; Dokumen Warga</h2>
              </div>

              {/* Filter Kategori Dokumen */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                {['ALL', 'financial_report', 'minutes', 'letter', 'other'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-full text-xs transition-colors ${
                      selectedCategory === cat
                        ? 'bg-[#1d1d1f] text-white font-medium shadow-xs'
                        : 'bg-white text-[#707070] border border-[#d2d2d7] hover:text-[#1d1d1f] hover:bg-[#f5f5f7]'
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
                  <div key={i} className="h-28 rounded-lg bg-[#e2e2e5] animate-pulse" />
                ))}
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#d2d2d7] p-8 text-center bg-white space-y-1">
                <FileText className="w-7 h-7 text-[#858585] mx-auto" />
                <p className="font-semibold text-xs text-[#1d1d1f]">Tidak ada dokumen pada kategori ini</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="apple-card p-4 sm:p-5 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <span className="inline-block px-2.5 py-0.5 bg-[#f4f8fb] text-[#0066cc] border border-[#d2d2d7] rounded-full text-[10px] font-semibold uppercase tracking-wider">
                        {doc.category.replace('_', ' ')}
                      </span>
                      <h4 className="font-semibold text-sm text-[#1d1d1f] leading-snug line-clamp-2">
                        {doc.title}
                      </h4>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#d2d2d7] flex items-center justify-between">
                      <span className="text-[11px] text-[#707070] font-normal">
                        {new Date(doc.created_at).toLocaleDateString('id-ID')}
                      </span>
                      <a
                        href={getFileUrl(doc.file_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0066cc] hover:text-[#0071e3] bg-[#f4f8fb] hover:bg-[#e2e2e5] px-3 py-1.5 rounded-full border border-[#d2d2d7] transition-colors"
                      >
                        <Download className="w-3.5 h-3.5 text-[#0066cc]" /> Unduh Dokumen
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Modal Detail Pengumuman Lengkap */}
      {detailAnnouncement && (
        <AnnouncementDetailModal
          isOpen={Boolean(detailAnnouncement)}
          onClose={() => setDetailAnnouncement(null)}
          announcement={detailAnnouncement}
          onShare={(item) => {
            setDetailAnnouncement(null);
            setShareTarget({
              title: item.title,
              content: item.content,
              created_at: item.created_at,
            });
          }}
        />
      )}

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
