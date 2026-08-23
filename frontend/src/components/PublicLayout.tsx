import React from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Building2,
  FileText,
  MessageSquareHeart,
  CalendarDays,
  LogIn,
  UserPlus,
  ShieldCheck,
  Menu,
  X
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { usePublicTenantQuery } from '../services/public_tenant';
import { usePublicFinancialSummary, formatRupiah } from '../services/public_transparency';
import { PublicBottomNav } from './PublicBottomNav';

const NAV_ITEMS = [
  { to: '/public/announcements', label: 'Pengumuman & Dokumen', icon: FileText },
  { to: '/public/aspirations', label: 'Aspirasi & Kebutuhan', icon: MessageSquareHeart },
  { to: '/public/events', label: 'Agenda & Kegiatan', icon: CalendarDays },
];

export const PublicLayout: React.FC = () => {
  const { user } = useAuthStore();
  const { data: tenantInfo } = usePublicTenantQuery();
  const { data: kas } = usePublicFinancialSummary();
  const isAuthenticated = Boolean(user);
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const tenantName = tenantInfo?.name || 'Portal RT';

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
            <Link to="/public/announcements" className="flex items-center gap-3">
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
              {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
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
            <div className="hidden sm:flex items-center gap-2">
              {isAuthenticated ? (
                <button
                  onClick={() => navigate('/')}
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

        {/* Mobile drawer (di luar BottomNav: untuk konten panjang seperti login) */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
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
            <div className="pt-2 border-t border-slate-100">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center bg-slate-900 text-white font-semibold text-sm py-2.5 rounded-lg"
              >
                {isAuthenticated ? 'Buka Dashboard Internal' : 'Masuk / Daftar Akun'}
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area — ruang untuk BottomNav di ponsel */}
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Footer — tanpa alamat/email fiktif */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-8 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Building2 className="w-4 h-4 text-emerald-400" /> {tenantName.toUpperCase()}
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              <li><Link to="/public/announcements" className="hover:text-white">Pengumuman &amp; Kas</Link></li>
              <li><Link to="/public/aspirations" className="hover:text-white">Usulan Warga</Link></li>
              <li><Link to="/public/events" className="hover:text-white">Agenda</Link></li>
            </ul>
          </div>
          <div className="pt-6 mt-6 border-t border-slate-800 text-slate-500">
            © {new Date().getFullYear()} {tenantName}. Sistem transparansi lingkungan warga.
          </div>
        </div>
      </footer>

      <PublicBottomNav />
    </div>
  );
};
