import React from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  WalletCards,
  ArrowRight,
  Bell,
  BellRing,
  Check,
  FileSpreadsheet,
  Recycle,
  Flame
} from 'lucide-react';
import { enablePushNotifications } from '../services/push';
import { useAuthStore } from '../store/useAuthStore';

export const PlatformLandingPage: React.FC = () => {
  const { user } = useAuthStore();
  const [pushStatus, setPushStatus] = React.useState<'idle' | 'loading' | 'enabled' | 'error'>('idle');
  const [pushMsg, setPushMsg] = React.useState('');

  const handleEnablePush = async () => {
    setPushStatus('loading');
    setPushMsg('');
    const res = await enablePushNotifications();
    if (res.ok) {
      setPushStatus('enabled');
      setPushMsg('Notifikasi berhasil diaktifkan!');
      setTimeout(() => setPushMsg(''), 4000);
    } else {
      setPushStatus('error');
      setPushMsg(res.reason || 'Gagal mengaktifkan notifikasi');
      setTimeout(() => setPushMsg(''), 4000);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] font-sans flex flex-col selection:bg-[#0071e3]/20 selection:text-[#1d1d1f]">
      {/* Header Sticky */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-[#d2d2d7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-[#f5f5f7] border border-[#d2d2d7] flex items-center justify-center text-[#0071e3] shadow-2xs">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <span className="font-semibold text-base sm:text-lg tracking-tight block leading-tight text-[#1d1d1f]">
                SiTransparan <span className="text-[#0071e3]">RT/RW</span>
              </span>
              <span className="text-[10px] sm:text-[11px] font-medium text-[#707070] tracking-wider uppercase block">
                Platform Tata Kelola Terbuka
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleEnablePush}
              disabled={pushStatus === 'loading' || pushStatus === 'enabled'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium apple-btn-secondary transition-colors"
            >
              {pushStatus === 'enabled' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#0066cc]" /> <span className="hidden sm:inline">Notif</span> Aktif
                </>
              ) : pushStatus === 'loading' ? (
                <>
                  <BellRing className="w-3.5 h-3.5 animate-spin text-[#0071e3]" /> <span className="hidden sm:inline">Mengaktifkan...</span>
                </>
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5 text-[#0071e3]" /> <span className="hidden sm:inline">Aktifkan</span> Notifikasi
                </>
              )}
            </button>

            {user ? (
              <Link
                to={user.role === 'SUPER_ADMIN' || String(user.role).toLowerCase() === 'superadmin' ? '/admin/tenants' : '/admin'}
                className="inline-flex items-center gap-2 apple-btn-primary text-xs sm:text-sm px-4 sm:px-5 py-2 active:scale-95 shadow-2xs"
              >
                Buka Dashboard <ArrowRight className="w-4 h-4 text-white" />
              </Link>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 apple-btn-primary text-xs sm:text-sm px-4 sm:px-5 py-2 active:scale-95 shadow-2xs"
              >
                Masuk Pengurus <ArrowRight className="w-4 h-4 text-white" />
              </Link>
            )}
          </div>
        </div>
      </header>

      {pushMsg && (
        <div
          role="alert"
          className={`px-4 py-2 text-center text-xs font-semibold ${
            pushStatus === 'enabled' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          }`}
        >
          {pushMsg}
        </div>
      )}

      {/* Hero Section: Editorial & Dignified Headline without AI Kicker Badge */}
      <section className="relative overflow-hidden pt-16 pb-16 sm:pt-24 sm:pb-20 border-b border-[#d2d2d7] bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10 text-center space-y-6">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-semibold tracking-tight leading-[1.12] text-[#1d1d1f]">
            Transparansi Nyata Kas &amp; Keputusan Rukun Tetangga
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base md:text-lg text-[#707070] leading-relaxed font-normal">
            Platform tata kelola mandiri untuk RT/RW Indonesia. Pemisahan kas multi-kantong, arsip notula sah, dan tabungan bank sampah keluarga dalam satu kendali terbuka.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            {user ? (
              <Link
                to={user.role === 'SUPER_ADMIN' || String(user.role).toLowerCase() === 'superadmin' ? '/admin/tenants' : '/admin'}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full apple-btn-primary text-sm shadow-2xs transition-all"
              >
                Buka Dashboard Pengurus
              </Link>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full apple-btn-primary text-sm shadow-2xs transition-all"
              >
                Masuk ke Portal Pengurus
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Asymmetrical Bento Grid (Impeccable Anti-Slop: Distinctive, Data-First, Varied Weights) */}
      <section className="py-16 sm:py-24 bg-[#f5f5f7]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#d2d2d7] pb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold text-[#1d1d1f] tracking-tight">
                Pilar Utama Sistem Tata Kelola
              </h2>
              <p className="text-xs sm:text-sm text-[#707070] mt-0.5">
                Setiap rupiah dan notula keputusan dapat diaudit langsung oleh warga RT.
              </p>
            </div>
            <span className="text-xs font-mono font-medium text-[#707070] uppercase tracking-wider">
              Arsitektur Multi-Tenant Terisolasi
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Bento Card 1: Kas Multi-Kantong (Featured Hero Tile, 8-col) */}
            <div className="lg:col-span-8 apple-card p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#f4f8fb] text-[#0066cc] border border-[#d2d2d7]">
                    <WalletCards className="w-3.5 h-3.5" /> Buku Kas RT
                  </span>
                  <span className="text-xs font-mono text-[#707070]">Perpetual &amp; Append-Only</span>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-[#1d1d1f]">
                  Pemisahan Kas Operasional, Sosial, &amp; Pembangunan
                </h3>
                <p className="text-xs sm:text-sm text-[#707070] max-w-xl leading-relaxed">
                  Tidak ada dana yang tercampur. Iuran warga otomatis dialokasikan ke pos peruntukan masing-masing dengan riwayat mutasi yang tidak bisa diubah (immutable log).
                </p>
              </div>

              {/* Data Snapshot Mockup */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-[#f5f5f7] border border-[#d2d2d7] text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] text-[#707070]">Kas Operasional RT</span>
                  <p className="font-semibold text-[#1d1d1f] text-sm tabular-nums">Rp 12.450.000</p>
                  <span className="text-[10px] text-[#0066cc] font-medium">98% Iuran Terkumpul</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-[#707070]">Dana Sosial / Duka</span>
                  <p className="font-semibold text-[#1d1d1f] text-sm tabular-nums">Rp 4.800.000</p>
                  <span className="text-[10px] text-emerald-700 font-medium">Siap Salur Kapanpun</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-[#707070]">Kas Pembangunan</span>
                  <p className="font-semibold text-[#1d1d1f] text-sm tabular-nums">Rp 8.150.000</p>
                  <span className="text-[10px] text-[#707070]">Pos Renovasi Pintu Portal</span>
                </div>
              </div>
            </div>

            {/* Bento Card 2: Musyawarah & Notula Sah (Compact Vertical Tile, 4-col) */}
            <div className="lg:col-span-4 apple-card p-6 sm:p-7 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#f4f8fb] text-[#0066cc] border border-[#d2d2d7]">
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Musyawarah
                </span>
                <h3 className="text-base sm:text-lg font-semibold text-[#1d1d1f]">
                  Notula &amp; Keputusan Sah
                </h3>
                <p className="text-xs text-[#707070] leading-relaxed">
                  Hasil rapat warga, daftar hadir, dan lembar keputusan ber-SK tersimpan permanen dan dapat diunduh kapan saja.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-[#f5f5f7] border border-[#d2d2d7] space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-[#1d1d1f]">Rapat Pleno RT 003</span>
                  <span className="text-[10px] text-[#707070]">Juli 2026</span>
                </div>
                <p className="text-[11px] text-[#707070]">
                  Kesepakatan jadwal ronda malam &amp; penyesuaian tarif iuran sampah.
                </p>
              </div>
            </div>

            {/* Bento Card 3: Bank Sampah Terintegrasi (6-col) */}
            <div className="lg:col-span-6 apple-card p-6 sm:p-7 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#f4f8fb] text-[#0066cc] border border-[#d2d2d7]">
                  <Recycle className="w-3.5 h-3.5" /> Bank Sampah
                </span>
                <h3 className="text-base sm:text-lg font-semibold text-[#1d1d1f]">
                  Bagi Hasil Sampah Terpilah
                </h3>
                <p className="text-xs text-[#707070] leading-relaxed">
                  Setoran sampah anorganik tercatat per nomor rumah warga dengan pembagian hasil otomatis ke buku tabungan KK dan kas Karang Taruna.
                </p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[#f5f5f7] border border-[#d2d2d7] text-xs">
                <div>
                  <span className="text-[10px] text-[#707070] block">Rasio Bagi Hasil Baku</span>
                  <strong className="text-sm font-semibold text-[#1d1d1f]">80% Warga · 20% Pemuda</strong>
                </div>
                <span className="text-[11px] font-semibold text-[#0066cc]">Transparan Otomatis</span>
              </div>
            </div>

            {/* Bento Card 4: Saluran Aspirasi & Pemuda (6-col) */}
            <div className="lg:col-span-6 apple-card p-6 sm:p-7 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#f4f8fb] text-[#0066cc] border border-[#d2d2d7]">
                  <Flame className="w-3.5 h-3.5" /> Aspirasi Warga
                </span>
                <h3 className="text-base sm:text-lg font-semibold text-[#1d1d1f]">
                  Partisipasi Bebas Hambatan
                </h3>
                <p className="text-xs text-[#707070] leading-relaxed">
                  Warga dapat menyampaikan usulan perbaikan fasilitas, aduan lampu jalan, atau ide kegiatan kepemudaan yang terpantau status tindak lanjutnya.
                </p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[#f5f5f7] border border-[#d2d2d7] text-xs">
                <div>
                  <span className="text-[10px] text-[#707070] block">Status Tindak Lanjut</span>
                  <strong className="text-sm font-semibold text-emerald-700">Terverifikasi &amp; Terbuka</strong>
                </div>
                <span className="text-[11px] font-semibold text-[#707070]">Tanpa Birokrasi Rumit</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Platform */}
      <footer className="mt-auto border-t border-[#d2d2d7] bg-white py-8 text-[#707070] text-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#0071e3]" />
            <span className="font-semibold text-[#1d1d1f]">SiTransparan RT/RW</span> · Platform Tata Kelola Rukun Tetangga Terbuka
          </div>
          <p className="text-[11px] text-[#707070]">
            Dikelola independen oleh pengurus lingkungan RT setempat.
          </p>
        </div>
      </footer>
    </div>
  );
};
