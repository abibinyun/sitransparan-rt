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
  ShieldCheck,
  Bell,
  Menu,
  X,
  Check,
  Landmark,
  User
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { usePublicTenantQuery } from '../services/public_tenant';
import { usePublicFinancialSummary, formatRupiah } from '../services/public_transparency';
import { enablePushNotifications } from '../services/push';
import { PublicBottomNav } from './PublicBottomNav';
import { PWAInstallPrompt } from './PWAInstallPrompt';
import { TenantNotFoundPage } from './TenantNotFoundPage';
import { getFileUrl } from '../utils/file';

const NAV_ITEMS = [
  { to: '/', label: 'Kabar & Dokumen', icon: FileText, end: true },
  { to: '/usulan', label: 'Aspirasi & Kebutuhan', icon: MessageSquareHeart },
  { to: '/agenda', label: 'Agenda Warga', icon: CalendarDays },
  { to: '/karang-taruna', label: 'Karang Taruna', icon: Flame },
  { to: '/bank-sampah', label: 'Bank Sampah', icon: Recycle },
];

export const PublicLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();
  const { data: tenantInfo, isLoading: isTenantLoading, isError: isTenantError } = usePublicTenantQuery();
  const { data: kas } = usePublicFinancialSummary();
  const isAuthenticated = Boolean(user);
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [pushStatus, setPushStatus] = React.useState<'idle' | 'loading' | 'enabled' | 'error'>('idle');
  const [pushMsg, setPushMsg] = React.useState('');

  const tenantName = tenantInfo?.name || 'Portal RT';

  // Jika di subdomain tapi tenant tidak ditemukan di backend (404/non-existent slug)
  if (!isTenantLoading && (isTenantError || tenantInfo === null)) {
    return <TenantNotFoundPage />;
  }

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-950 pb-16 md:pb-0">
      {/* Top Banner Transparansi Kas & Status RT */}
      <div className="bg-slate-950 text-slate-300 text-xs py-2.5 px-4 border-b border-slate-850">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-medium truncate">
            <span className="inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[11px] font-bold shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" /> Portal Terbuka
            </span>
            <span className="truncate font-semibold text-slate-200">
              {tenantName}
            </span>
          </div>

          <div className="flex items-center gap-4 shrink-0 text-xs">
            {kas && (
              <span className="hidden sm:inline-flex items-center gap-1.5 tabular-nums">
                <Landmark className="w-3.5 h-3.5 text-emerald-400" />
                Saldo Kas Kasbon/Iuran: <strong className="text-white font-bold">{formatRupiah(kas.current_balance)}</strong>
              </span>
            )}
            <button
              onClick={handleEnablePush}
              disabled={pushStatus === 'loading' || pushStatus === 'enabled'}
              className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-bold"
            >
              {pushStatus === 'enabled' ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" /> Notif Aktif
                </>
              ) : (
                <>
                  <Bell className="w-3 h-3" /> Bunyikan Notif
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Header Utama Desktop & Mobile */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 sm:h-18">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white overflow-hidden shadow-sm group-hover:bg-slate-800 transition-colors">
                {tenantInfo?.logo_url ? (
                  <img src={getFileUrl(tenantInfo.logo_url)} alt={tenantName} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-5 h-5 text-emerald-400" />
                )}
              </div>
              <div>
                <span className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight block leading-tight">
                  {tenantName}
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 tracking-wider uppercase block">
                  Transparansi &amp; Partisipasi Warga
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Pills */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </NavLink>
              ))}
            </nav>

            {/* Aksi Akun Pengurus / Login */}
            <div className="hidden md:flex items-center gap-2">
              {isAuthenticated ? (
                <button
                  onClick={() => navigate('/admin')}
                  className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs"
                >
                  <User className="w-4 h-4 text-emerald-400" /> Panel Internal
                </button>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs"
                >
                  <LogIn className="w-4 h-4 text-emerald-400" /> Masuk Pengurus
                </Link>
              )}
            </div>

            {/* Mobile Menu Trigger */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl border border-slate-200 text-slate-700 bg-white"
                aria-label="Buka Menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1 shadow-lg">
            {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold ${
                    isActive ? 'bg-emerald-50 text-emerald-800' : 'text-slate-700 hover:bg-slate-50'
                  }`
                }
              >
                <Icon className="w-4 h-4 text-emerald-600" />
                {label}
              </NavLink>
            ))}
            <div className="pt-2 border-t border-slate-100">
              {isAuthenticated ? (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/admin');
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white font-bold text-xs py-2.5 rounded-xl"
                >
                  <User className="w-4 h-4 text-emerald-400" /> Masuk Panel Internal
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white font-bold text-xs py-2.5 rounded-xl"
                >
                  <LogIn className="w-4 h-4 text-emerald-400" /> Masuk Pengurus RT
                </Link>
              )}
            </div>
          </div>
        )}
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

      {/* Main Container */}
      <main className="flex-1">
        {children || <Outlet />}
      </main>

      {/* PWA Prompt & Mobile Bottom Navigation */}
      <PWAInstallPrompt />
      <PublicBottomNav />

      {/* Footer Minimalist */}
      <footer className="border-t border-slate-200/80 bg-white py-8 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 space-y-2">
          <p className="font-semibold text-slate-700">
            {tenantName} — Portal Transparansi &amp; Administrasi Mandiri
          </p>
          <p className="text-[11px] text-slate-400">
            Didukung oleh platform terbuka SiTransparan RT/RW. Data dapat diaudit langsung oleh seluruh warga.
          </p>
        </div>
      </footer>
    </div>
  );
};
