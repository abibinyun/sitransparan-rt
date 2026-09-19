import React from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  ShieldCheck,
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

      {/* Hero Section Apple */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-[#d2d2d7] bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 text-center space-y-6">
          <div className="apple-badge">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0071e3]" /> Standar Baru Transparansi RT/RW Indonesia
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-semibold tracking-tight max-w-4xl mx-auto leading-[1.15] text-[#1d1d1f]">
            Tata Kelola Lingkungan yang <span className="text-[#0071e3]">Terang, Jujur</span>, &amp; Berdaya Bersama.
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base md:text-lg text-[#707070] leading-relaxed font-normal">
            Platform tata kelola mandiri berbasis multi-tenant untuk setiap Rukun Tetangga (RT). Kas kasbon &amp; iuran terbuka real-time, partisipasi warga, pemuda Karang Taruna, dan Bank Sampah dalam satu sistem.
          </p>

          {/* Tombol Aksi Utama */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            {user ? (
              <Link
                to={user.role === 'SUPER_ADMIN' || String(user.role).toLowerCase() === 'superadmin' ? '/admin/tenants' : '/admin'}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full apple-btn-primary text-sm shadow-2xs transition-all"
              >
                Lanjut ke Dashboard Pengurus
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

      {/* 4 Pilar Transparansi Lingkungan */}
      <section className="py-16 sm:py-24 bg-[#f5f5f7]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-semibold text-[#0071e3] tracking-wider uppercase">Standar Tata Kelola Warga</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-[#1d1d1f] tracking-tight">
              Keterbukaan Total Tanpa Modus
            </h2>
            <p className="text-[#707070] text-sm sm:text-base">
              Setiap rupiah iuran, keputusan musyawarah, dan suara warga tercatat jelas dalam sistem yang dapat diaudit bersama.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="apple-card p-6 space-y-3">
              <div className="w-12 h-12 rounded-lg bg-[#f4f8fb] text-[#0066cc] border border-[#d2d2d7] flex items-center justify-center font-semibold">
                <WalletCards className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-[#1d1d1f]">Kas Multi-Kantong</h3>
              <p className="text-xs text-[#707070] leading-relaxed">
                Pemisahan tegas saldo kas operasional, dana sosial kematian, pembangunan fisik, dan kas kepemudaan. Bebas manipulasi.
              </p>
            </div>

            <div className="apple-card p-6 space-y-3">
              <div className="w-12 h-12 rounded-lg bg-[#f4f8fb] text-[#0066cc] border border-[#d2d2d7] flex items-center justify-center font-semibold">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-[#1d1d1f]">Musyawarah &amp; Notula Sah</h3>
              <p className="text-xs text-[#707070] leading-relaxed">
                Dokumen SK, notula rapat RT, serta LPJ keuangan bulanan diunggah rapi dan dapat diunduh langsung oleh warga.
              </p>
            </div>

            <div className="apple-card p-6 space-y-3">
              <div className="w-12 h-12 rounded-lg bg-[#f4f8fb] text-[#0066cc] border border-[#d2d2d7] flex items-center justify-center font-semibold">
                <Recycle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-[#1d1d1f]">Bank Sampah Bagi Hasil</h3>
              <p className="text-xs text-[#707070] leading-relaxed">
                Pencatatan setoran sampah anorganik keluarga dengan saldo tabungan warga langsung dan porsi operasional Karang Taruna.
              </p>
            </div>

            <div className="apple-card p-6 space-y-3">
              <div className="w-12 h-12 rounded-lg bg-[#f4f8fb] text-[#0066cc] border border-[#d2d2d7] flex items-center justify-center font-semibold">
                <Flame className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-[#1d1d1f]">Pemuda &amp; Aspirasi</h3>
              <p className="text-xs text-[#707070] leading-relaxed">
                Wadah resmi struktur Karang Taruna dan formulir aspirasi lingkungan terverifikasi yang langsung dipantau pengurus RT.
              </p>
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
