import React from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  ShieldCheck,
  WalletCards,
  MessageSquareHeart,
  ArrowRight,
  Lock,
  Search,
  Bell,
  BellRing,
  Check
} from 'lucide-react';
import { useTenantsQuery } from '../services/tenant';
import { enablePushNotifications } from '../services/push';
import { getTenantUrl, getTenantBaseDomain } from '../utils/tenant';

export const PlatformLandingPage: React.FC = () => {
  const { data: tenants } = useTenantsQuery();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [pushStatus, setPushStatus] = React.useState<'idle' | 'loading' | 'enabled' | 'error'>('idle');
  const [pushMsg, setPushMsg] = React.useState('');

  const handleEnablePush = async () => {
    setPushStatus('loading');
    setPushMsg('');
    const res = await enablePushNotifications();
    if (res.ok) {
      setPushStatus('enabled');
      setPushMsg('Notifikasi warga aktif!');
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
    <div className="min-h-screen bg-slate-900 text-white font-sans flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight block leading-tight">SiTransparan RT/RW</span>
              <span className="text-[11px] font-semibold text-emerald-400 tracking-wider uppercase block">Platform Tata Kelola Warga</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleEnablePush}
              disabled={pushStatus === 'loading' || pushStatus === 'enabled'}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                pushStatus === 'enabled'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-200'
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
                  <Bell className="w-4 h-4 text-emerald-400" /> <span>Notifikasi</span>
                </>
              )}
            </button>

            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-lg transition-colors shadow-lg shadow-emerald-500/20"
            >
              Masuk <span className="hidden sm:inline">Platform</span> <ArrowRight className="w-4 h-4" />
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
      <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28 border-b border-slate-800 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold mb-6">
            <ShieldCheck className="w-4 h-4" /> SaaS Multi-Tenant Tata Kelola &amp; Kas Terbuka
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight sm:leading-none">
            Transparansi Kas &amp; Administrasi Lingkungan RT/RW Modern
          </h1>
          <p className="mt-6 text-base sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Platform mandiri untuk setiap lingkungan RT. Transparansi kas kasbon/iuran, keterbukaan musyawarah, digitalisasi kependudukan, dan partisipasi warga.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#direktori-rt"
              className="inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-950 font-bold text-sm px-6 py-3 rounded-xl transition-all shadow-xl"
            >
              <Search className="w-4 h-4 text-emerald-600" /> Cari Lingkungan RT Anda
            </a>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-sm px-6 py-3 rounded-xl transition-all"
            >
              Masuk Akun Pengurus
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-slate-950 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Dirancang Khusus untuk Kebutuhan Rukun Tetangga</h2>
            <p className="mt-3 text-slate-400 text-sm">Setiap RT memiliki portal subdomain tersendiri dengan basis data yang terisolasi total.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-5">
                <WalletCards className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">Kas Terbuka &amp; Iuran Otomatis</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Riwayat kas masuk dan keluar tercatat secara append-only. Warga dapat melihat ringkasan keuangan dan memverifikasi bukti bayar secara transparan.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-5">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">Data Kependudukan Terenkripsi</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Pencatatan NIK warga dilindungi enkripsi AES-256-GCM server-side. Data kependudukan terpisah rapi di skema database khusus masing-masing RT.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-5">
                <MessageSquareHeart className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">Musyawarah &amp; Usulan Warga</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Notulen rapat lingkungan, aspirasi anonim, dan polling suara warga yang dapat diakses langsung oleh seluruh warga lingkungan.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Directory Section */}
      <section id="direktori-rt" className="py-20 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Direktori Portal RT Aktif</h2>
              <p className="mt-2 text-slate-400 text-sm">Pilih lingkungan RT untuk membuka portal transparansi warga.</p>
            </div>
            <div className="w-full md:w-72 relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama atau kode RT..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredTenants.length > 0 ? (
              filteredTenants.map((t) => (
                <a
                  key={t.id}
                  href={getTenantUrl(t.slug, '/')}
                  className="group bg-slate-950 border border-slate-800 hover:border-emerald-500/50 p-5 rounded-2xl transition-all hover:shadow-lg hover:shadow-emerald-950/20 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">
                        <Building2 className="w-4 h-4" />
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        Aktif
                      </span>
                    </div>
                    <h3 className="font-bold text-white group-hover:text-emerald-400 transition-colors">{t.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 font-mono">{t.slug}.{getTenantBaseDomain()}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between text-xs text-slate-400 group-hover:text-white">
                    <span>Buka Portal</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </a>
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-slate-500 bg-slate-950 border border-slate-800 rounded-2xl">
                Tidak ada RT yang cocok dengan pencarian "{searchTerm}"
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-slate-950 border-t border-slate-800 py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4">
          <p>© {new Date().getFullYear()} SiTransparan RT/RW. Platform Tata Kelola Warga Multi-Tenant Terbuka.</p>
        </div>
      </footer>
    </div>
  );
};
