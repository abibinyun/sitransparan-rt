import React from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Building2,
  FileText,
  MessageSquareHeart,
  CalendarDays,
  Flame,
  Recycle,
  LogIn,
  UserPlus,
  ShieldCheck,
  Bell,
  BellRing,
  Menu,
  X,
  Check
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { usePublicTenantQuery } from '../services/public_tenant';
import { usePublicFinancialSummary, formatRupiah } from '../services/public_transparency';
import { enablePushNotifications } from '../services/push';
import { PublicBottomNav } from './PublicBottomNav';
import { PWAInstallPrompt } from './PWAInstallPrompt';

const NAV_ITEMS = [
  { to: '/', label: 'Pengumuman & Dokumen', icon: FileText, end: true },
  { to: '/usulan', label: 'Aspirasi & Kebutuhan', icon: MessageSquareHeart },
  { to: '/agenda', label: 'Agenda & Kegiatan', icon: CalendarDays },
  { to: '/karang-taruna', label: 'Karang Taruna', icon: Flame },
  { to: '/bank-sampah', label: 'Bank Sampah', icon: Recycle },
];

export const PublicLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();
  const { data: tenantInfo } = usePublicTenantQuery();
  const { data: kas } = usePublicFinancialSummary();
  const isAuthenticated = Boolean(user);
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [pushStatus, setPushStatus] = React.useState<'idle' | 'loading' | 'enabled' | 'error'>('idle');
  const [pushMsg, setPushMsg] = React.useState('');

  const tenantName = tenantInfo?.name || 'Portal RT';

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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Strip status: identitas + satu angka nyata (bukan deretan statistik palsu) */}
      <div className="bg-slate-900 text-slate-300 text-xs py-2 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 font-medium truncate">
            <span className="inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[11px] shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" /> Terbuka
            </span>
            <span className="truncate">Portal Transparansi {tenantName}</span>
          </span>
          {kas && (
            <span className="shrink-0 tabular-nums">
              Saldo kas: <strong className="text-white font-semibold">{formatRupiah(kas.current_balance)}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-white overflow-hidden">
                {tenantInfo?.logo_url ? (
                  <img src={tenantInfo.logo_url} alt={tenantName} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-5 h-5" />
                )}
              </div>
              <div>
                <span className="font-extrabold text-lg text-slate-900 tracking-tight block leading-tight uppercase">{tenantName}</span>
                <span className="text-[11px] font-semibold text-emerald-700 tracking-wider uppercase block">Portal Transparansi Warga</span>
              </div>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold border ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-white text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-200'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </NavLink>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleEnablePush}
                disabled={pushStatus === 'loading' || pushStatus === 'enabled'}
                title="Aktifkan Notifikasi Warga"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-lg text-xs font-semibold border transition-all ${
                  pushStatus === 'enabled'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 cursor-default'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-sm'
                }`}
              >
                {pushStatus === 'enabled' ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" /> <span className="hidden sm:inline">Notif</span> Aktif
                  </>
                ) : pushStatus === 'loading' ? (
                  <>
                    <BellRing className="w-4 h-4 animate-spin text-emerald-600" /> <span className="hidden sm:inline">Mengaktifkan...</span>
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4 text-emerald-600" /> <span>Notifikasi</span>
                  </>
                )}
              </button>

              <div className="hidden sm:flex items-center gap-2">
                {isAuthenticated ? (
                  <button
                    onClick={() => navigate('/admin')}
                    className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2.5 rounded-lg"
                  >
                    <Building2 className="w-4 h-4" /> Dashboard Pengurus
                  </button>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100"
                    >
                      <LogIn className="w-4 h-4" /> Masuk Warga
                    </Link>
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2.5 rounded-lg"
                    >
                      <UserPlus className="w-4 h-4" /> Daftar
                    </Link>
                  </>
                )}
              </div>

              {/* Mobile menu button */}
              <div className="flex md:hidden">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  aria-label={mobileMenuOpen ? 'Tutup menu' : 'Buka menu'}
                  className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
                >
                  {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile drawer (di luar BottomNav: untuk konten panjang seperti login) */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold ${
                    isActive ? 'bg-emerald-50 text-emerald-800' : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
              >
                <Icon className="w-4 h-4" /> {label}
              </NavLink>
            ))}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <button
                type="button"
                onClick={handleEnablePush}
                disabled={pushStatus === 'loading' || pushStatus === 'enabled'}
                className="w-full flex items-center justify-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm py-2.5 rounded-lg"
              >
                {pushStatus === 'enabled' ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" /> Notifikasi Aktif
                  </>
                ) : pushStatus === 'loading' ? (
                  <>
                    <BellRing className="w-4 h-4 animate-spin text-emerald-600" /> Mengaktifkan...
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4 text-slate-600" /> Aktifkan Notifikasi Warga
                  </>
                )}
              </button>

              <Link
                to={isAuthenticated ? '/admin' : '/login'}
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center bg-slate-900 text-white font-semibold text-sm py-2.5 rounded-lg"
              >
                {isAuthenticated ? 'Buka Dashboard Internal' : 'Masuk / Daftar Akun'}
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Toast Feedback */}
      {pushMsg && (
        <div
          role="alert"
          className={`px-4 py-2 text-center text-xs font-semibold ${
            pushStatus === 'enabled'
              ? 'bg-emerald-600 text-white'
              : 'bg-rose-600 text-white'
          }`}
        >
          {pushMsg}
        </div>
      )}

      {/* Main Content Area — ruang untuk BottomNav di ponsel */}
      <main className="flex-1 pb-20 md:pb-0">
        {children || <Outlet />}
      </main>

      {/* Footer — tanpa alamat/email fiktif */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-8 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Building2 className="w-4 h-4 text-emerald-400" /> {tenantName.toUpperCase()}
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              <li><Link to="/" className="hover:text-white">Pengumuman &amp; Kas</Link></li>
              <li><Link to="/usulan" className="hover:text-white">Usulan Warga</Link></li>
              <li><Link to="/agenda" className="hover:text-white">Agenda</Link></li>
            </ul>
          </div>
          <div className="pt-6 mt-6 border-t border-slate-800 text-slate-500">
            © {new Date().getFullYear()} {tenantName}. Sistem transparansi lingkungan warga.
          </div>
        </div>
      </footer>

      <PublicBottomNav />
      <PWAInstallPrompt />
    </div>
  );
};
