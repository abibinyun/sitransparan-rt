import React from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  ShieldCheck,
  WalletCards,
  ArrowRight,
  Search,
  Bell,
  BellRing,
  Check,
  FileSpreadsheet,
  Recycle,
  ChevronRight,
  Landmark,
  Flame
} from 'lucide-react';
import { useTenantsQuery } from '../services/tenant';
import { enablePushNotifications } from '../services/push';
import { getTenantUrl, getTenantBaseDomain } from '../utils/tenant';

export const PlatformLandingPage: React.FC = () => {
  const { data: tenants, isLoading } = useTenantsQuery();
  const [searchTerm, setSearchTerm] = React.useState('');
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

  const filteredTenants = (tenants || []).filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      {/* Header Sticky */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <span className="font-extrabold text-base sm:text-lg tracking-tight block leading-tight text-white">
                SiTransparan <span className="text-emerald-400">RT/RW</span>
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 tracking-wider uppercase block">
                Platform Tata Kelola Terbuka
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleEnablePush}
              disabled={pushStatus === 'loading' || pushStatus === 'enabled'}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                pushStatus === 'enabled'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-800 hover:bg-slate-700/80 border-slate-700 text-slate-200'
              }`}
            >
              {pushStatus === 'enabled' ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" /> <span className="hidden sm:inline">Notif</span> Aktif
                </>
              ) : pushStatus === 'loading' ? (
                <>
                  <BellRing className="w-4 h-4 animate-spin text-emerald-400" /> <span className="hidden sm:inline">Mengaktifkan...</span>
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4 text-emerald-400" /> <span className="hidden sm:inline">Aktifkan</span> Notifikasi
                </>
              )}
            </button>

            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm px-4 sm:px-5 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-500/20 active:scale-95"
            >
              Masuk Pengurus <ArrowRight className="w-4 h-4" />
            </Link>
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

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-slate-800 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
        {/* Subtle grid backdrop */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3.5 py-1.5 rounded-full text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" /> Standar Baru Transparansi RT/RW Indonesia
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-[1.15] text-white">
            Tata Kelola Lingkungan yang <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Terang, Jujur</span>, &amp; Berdaya Bersama.
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base md:text-lg text-slate-300 leading-relaxed font-normal">
            Platform tata kelola mandiri berbasis multi-tenant untuk setiap Rukun Tetangga (RT). Kas kasbon &amp; iuran terbuka real-time, partisipasi warga, pemuda Karang Taruna, dan Bank Sampah dalam satu sistem.
          </p>

          {/* Quick search input */}
          <div className="pt-4 max-w-xl mx-auto">
            <div className="relative flex items-center shadow-xl shadow-slate-950/50 rounded-2xl overflow-hidden border border-slate-700 bg-slate-800/90 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
              <input
                type="text"
                placeholder="Ketik nama atau kode RT lingkungan Anda..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent text-white placeholder-slate-400 pl-12 pr-4 py-3.5 sm:py-4 text-sm sm:text-base outline-none border-none"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Directory of RT Communities */}
      <section className="py-12 sm:py-16 bg-slate-950 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
                <Landmark className="w-4 h-4" /> Direktori Lingkungan
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Lingkungan RT yang Terdaftar
              </h2>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              Menampilkan {filteredTenants.length} komunitas aktif
            </span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-44 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
              ))}
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center space-y-3 bg-slate-900/30">
              <Building2 className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-slate-300 font-bold text-base">Lingkungan RT Tidak Ditemukan</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Coba gunakan kata kunci lain seperti nama wilayah atau kode subdomain RT Anda.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filteredTenants.map((tenant) => {
                const isCurrentDomain = window.location.hostname === getTenantBaseDomain();
                const portalHref = getTenantUrl(tenant.slug);

                return (
                  <div
                    key={tenant.id}
                    className="group relative rounded-2xl border border-slate-800 bg-slate-900/80 p-5 hover:border-emerald-500/50 hover:bg-slate-850 transition-all duration-200 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Aktif
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          {tenant.slug}.{getTenantBaseDomain()}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                          {tenant.name}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          Portal transparansi kas warga, agenda kerja bakti, Bank Sampah, &amp; pemuda Karang Taruna.
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                      {isCurrentDomain ? (
                        <a
                          href={portalHref}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300"
                        >
                          Buka Portal Warga <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </a>
                      ) : (
                        <Link
                          to={`/kabar`}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300"
                        >
                          Buka Portal Warga <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                      )}
                      <span className="text-[11px] text-slate-500 font-medium">Publik &amp; Terbuka</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 4 Pilar Transparansi Lingkungan */}
      <section className="py-16 sm:py-24 bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase">Standar Tata Kelola Warga</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Keterbukaan Total Tanpa Modus
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Setiap rupiah iuran, keputusan musyawarah, dan suara warga tercatat jelas dalam sistem yang dapat diaudit bersama.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold">
                <WalletCards className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Kas Multi-Kantong</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pemisahan tegas saldo kas operasional, dana sosial kematian, pembangunan fisik, dan kas kepemudaan. Bebas manipulasi.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Musyawarah &amp; Notula Sah</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Dokumen SK, notula rapat RT, serta LPJ keuangan bulanan diunggah rapi dan dapat diunduh langsung oleh warga.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold">
                <Recycle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Bank Sampah Bagi Hasil</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pencatatan setoran sampah anorganik keluarga dengan saldo tabungan warga langsung dan porsi operasional Karang Taruna.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center font-bold">
                <Flame className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Pemuda &amp; Aspirasi</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Wadah resmi struktur Karang Taruna dan formulir aspirasi lingkungan terverifikasi yang langsung dipantau pengurus RT.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Platform */}
      <footer className="mt-auto border-t border-slate-800 bg-slate-950 py-8 text-slate-500 text-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-slate-300">SiTransparan RT/RW</span> — Platform Tata Kelola Rukun Tetangga Terbuka
          </div>
          <p className="text-[11px] text-slate-500">
            Dikelola independen oleh pengurus lingkungan RT setempat.
          </p>
        </div>
      </footer>
    </div>
  );
};
