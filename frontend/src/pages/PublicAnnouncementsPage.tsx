import React, { useState, useEffect, useRef } from 'react';
import { useInfinitePublicAnnouncements, usePublicDocuments } from '../services/announcement_doc';
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
  AlertCircle,
  FileCheck,
  Share2,
  Bell,
  BellRing,
  Check,
  MessageCircle,
  CalendarCheck,
  Coffee,
  Info,
  Loader2,
} from 'lucide-react';

const CATEGORY_TABS = [
  { id: 'all', label: 'Semua Kabar', icon: null },
  { id: 'pengumuman', label: 'Pengumuman Resmi', icon: Megaphone },
  { id: 'kegiatan', label: 'Kegiatan & Gotong Royong', icon: CalendarCheck },
  { id: 'santai', label: 'Kabar Santai / Nongkrong', icon: Coffee },
  { id: 'info', label: 'Info & Tips Lingkungan', icon: Info },
];

export const PublicAnnouncementsPage: React.FC = () => {
  const [selectedTimelineCategory, setSelectedTimelineCategory] = useState<string>('all');
  const {
    data: infiniteData,
    isLoading: loadingAnnouncements,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfinitePublicAnnouncements(selectedTimelineCategory, 6);

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

  // Intersection Observer untuk Infinite Scroll Sosmed
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  React.useEffect(() => {
    let isMounted = true;
    checkPushSubscriptionActive().then((isActive) => {
      if (isMounted) {
        if (isActive) {
          setPushStatus('enabled');
        } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
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

  // Kumpulkan semua halaman pengumuman dari infinite query
  const allAnnouncements = infiniteData?.pages?.flatMap((page) => page.data || []) || [];
  const documents = documentsData?.data || [];

  const filteredAnnouncements = allAnnouncements.filter((item) => {
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

  // Helper badge kategori konten
  const renderCategoryBadge = (cat?: string) => {
    switch (cat) {
      case 'kegiatan':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CalendarCheck className="w-3 h-3 text-emerald-600" /> Kegiatan
          </span>
        );
      case 'santai':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            <Coffee className="w-3 h-3 text-amber-600" /> Kabar Santai
          </span>
        );
      case 'info':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200">
            <Info className="w-3 h-3 text-sky-600" /> Info
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#f4f8fb] text-[#0066cc] border border-[#d2d2d7]">
            <Megaphone className="w-3 h-3 text-[#0071e3]" /> Pengumuman
          </span>
        );
    }
  };

  return (
    <div className="pb-16 bg-[#f5f5f7] text-[#1d1d1f]">
      {/* Hero Section Apple (Clean Frost Canvas with Apple Blue Accent) */}
      <section className="bg-white text-[#1d1d1f] px-4 sm:px-6 py-12 sm:py-16 border-b border-[#d2d2d7]">
        <div className="max-w-6xl mx-auto space-y-3">
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

          {/* Section Timeline Kabar & Sosmed Warga */}
          <section className="space-y-5" aria-label="Daftar Pengumuman">
            <div className="space-y-3 border-b border-[#d2d2d7] pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#0071e3]" />
                  <h2 className="text-lg font-semibold text-[#1d1d1f]">Kabar &amp; Linimasa Warga</h2>
                </div>
                <span className="text-xs font-semibold text-[#707070] tabular-nums">
                  {filteredAnnouncements.length} postingan
                </span>
              </div>

              {/* Filter Bar Kategori Sosmed Warga */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {CATEGORY_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = selectedTimelineCategory === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSelectedTimelineCategory(tab.id)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-[0.98] ${
                        isActive
                          ? 'bg-[#1d1d1f] text-white shadow-xs'
                          : 'bg-white text-[#707070] border border-[#d2d2d7] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]'
                      }`}
                    >
                      {Icon && <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#0071e3]'}`} />}
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {loadingAnnouncements ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-44 rounded-xl bg-white border border-[#d2d2d7] animate-pulse" />
                ))}
              </div>
            ) : filteredAnnouncements.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#d2d2d7] p-10 text-center space-y-2 bg-white">
                <AlertCircle className="w-8 h-8 text-[#858585] mx-auto" />
                <p className="font-semibold text-sm text-[#1d1d1f]">Belum Ada Postingan</p>
                <p className="text-xs text-[#707070]">Kabar dan linimasa terbaru untuk kategori ini akan muncul di sini.</p>
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
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Badge Kategori Konten Nyata */}
                          {renderCategoryBadge(item.category)}

                          {/* Badge Visibilitas (Jika Khusus Warga) */}
                          {item.target === 'residents_only' && (
                            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                              Khusus Warga
                            </span>
                          )}

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

                    {/* Footer kartu: Reaksi Gotong Royong Warga + Icon Comment dengan Count */}
                    <div className="pt-3 border-t border-[#d2d2d7] flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <ReactionButton targetType="announcement" targetId={item.id} />
                        {item.allow_comments && (
                          <button
                            type="button"
                            onClick={() => setDetailAnnouncement(item)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-full border border-[#d2d2d7] bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e2e2e5] transition-all"
                            title="Buka komentar pengumuman"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-[#0066cc]" />
                            <span className="hidden sm:inline">Komentar</span>
                            {typeof item.comments_count === 'number' && item.comments_count > 0 && (
                              <span className="tabular-nums font-bold text-[#0066cc]">
                                {item.comments_count}
                              </span>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}

                {/* Infinite Scroll Trigger & Spinner */}
                <div ref={loadMoreRef} className="pt-2 text-center">
                  {isFetchingNextPage ? (
                    <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#0066cc] bg-white border border-[#d2d2d7] px-4 py-2 rounded-full shadow-2xs">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Memuat linimasa berikutnya...
                    </div>
                  ) : hasNextPage ? (
                    <button
                      type="button"
                      onClick={() => fetchNextPage()}
                      className="text-xs font-semibold text-[#0066cc] hover:text-[#0071e3] py-2"
                    >
                      Muat lebih banyak linimasa &darr;
                    </button>
                  ) : filteredAnnouncements.length > 5 ? (
                    <p className="text-[11px] text-[#858585] py-2">
                      Seluruh kabar linimasa telah ditampilkan.
                    </p>
                  ) : null}
                </div>
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
