import React, { Suspense } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { prefetchRoute } from '../utils/routePrefetch';
import {
  Building2,
  FileText,
  MessageSquareHeart,
  CalendarDays,
  Recycle,
  LogIn,
  ShieldCheck,
  Landmark,
  User
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { usePublicTenantQuery } from '../services/public_tenant';
import { usePublicFinancialSummary, formatRupiah } from '../services/public_transparency';
import { PublicBottomNav } from './PublicBottomNav';
import { PWAInstallPrompt } from './PWAInstallPrompt';
import { TenantNotFoundPage } from './TenantNotFoundPage';
import { getFileUrl } from '../utils/file';

const NAV_ITEMS = [
  { to: '/', label: 'Kabar & Dokumen', icon: FileText, end: true },
  { to: '/usulan', label: 'Aspirasi & Kebutuhan', icon: MessageSquareHeart },
  { to: '/agenda', label: 'Agenda Warga', icon: CalendarDays },
  { to: '/program', label: 'Program & Lingkungan', icon: Recycle },
];

export const PublicLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();
  const { data: tenantInfo, isLoading: isTenantLoading, isError: isTenantError } = usePublicTenantQuery();
  const { data: kas } = usePublicFinancialSummary();
  const isAuthenticated = Boolean(user);
  const navigate = useNavigate();

  const tenantName = tenantInfo?.name || 'Portal RT';

  // Jika di subdomain tapi tenant tidak ditemukan di backend (404/non-existent slug)
  if (!isTenantLoading && (isTenantError || tenantInfo === null)) {
    return <TenantNotFoundPage />;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] flex flex-col font-sans selection:bg-[#0071e3]/20 selection:text-[#0071e3] pb-16 md:pb-0">
      {/* Top Banner Transparansi Kas & Status RT (Apple Sub-Header) */}
      <div className="bg-[#1d1d1f] text-[#f5f5f7] text-xs py-2 px-4 border-b border-[#333333]">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-medium truncate">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#333333] text-[#2997ff]">
              <ShieldCheck className="w-3 h-3 text-[#2997ff]" /> Terverifikasi
            </span>
            <span className="truncate font-medium text-white text-xs">
              {tenantName}
            </span>
          </div>

          <div className="flex items-center gap-4 shrink-0 text-xs">
            {kas && (
              <span className="inline-flex items-center gap-1.5 tabular-nums text-[#f5f5f7]">
                <Landmark className="w-3.5 h-3.5 text-[#2997ff]" />
                <span className="hidden sm:inline text-[#858585]">Kas Terbuka:</span>
                <strong className="text-white font-semibold">{formatRupiah(kas.current_balance)}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Header Utama Desktop & Mobile (Clean White Glass) */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#d2d2d7]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-lg bg-[#f5f5f7] border border-[#d2d2d7] flex items-center justify-center text-[#1d1d1f] overflow-hidden group-hover:border-[#858585] transition-colors">
                {tenantInfo?.logo_url ? (
                  <img src={getFileUrl(tenantInfo.logo_url)} alt={tenantName} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-5 h-5 text-[#0071e3]" />
                )}
              </div>
              <div>
                <span className="font-semibold text-base sm:text-lg text-[#1d1d1f] tracking-tight block leading-tight">
                  {tenantName}
                </span>
                <span className="text-[10px] sm:text-[11px] font-medium text-[#707070] tracking-wider uppercase block">
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
                  onMouseEnter={() => prefetchRoute(to)}
                  onFocus={() => prefetchRoute(to)}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all ${
                      isActive
                        ? 'bg-[#1d1d1f] text-white font-medium'
                        : 'text-[#474747] hover:text-[#1d1d1f] hover:bg-[#e2e2e5]/60'
                    }`
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </NavLink>
              ))}
            </nav>

            {/* Aksi Akun Pengurus / Login (Desktop: Apple Blue CTA) */}
            <div className="hidden md:flex items-center gap-2">
              {isAuthenticated ? (
                <button
                  onClick={() => navigate('/admin')}
                  className="inline-flex items-center gap-1.5 apple-btn-primary text-xs"
                >
                  <User className="w-3.5 h-3.5" /> Panel Internal
                </button>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 apple-btn-primary text-xs"
                >
                  <LogIn className="w-3.5 h-3.5" /> Masuk Pengurus
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1">
        <Suspense
          fallback={
            <div className="max-w-6xl mx-auto px-4 py-8 space-y-4 animate-pulse">
              <div className="h-8 w-48 rounded-xl bg-slate-200" />
              <div className="h-44 rounded-2xl bg-slate-200" />
              <div className="h-64 rounded-2xl bg-slate-200" />
            </div>
          }
        >
          {children || <Outlet />}
        </Suspense>
      </main>

      {/* PWA Prompt & Mobile Bottom Navigation */}
      <PWAInstallPrompt />
      <PublicBottomNav />

      {/* Footer (Apple Frost Style) */}
      <footer className="border-t border-[#d2d2d7] bg-[#f5f5f7] py-10 text-center text-xs text-[#707070]">
        <div className="max-w-6xl mx-auto px-4 space-y-2">
          <p className="font-semibold text-[#1d1d1f]">
            {tenantName} · Portal Transparansi &amp; Administrasi Mandiri
          </p>
          <p className="text-[11px] text-[#858585]">
            Didukung oleh platform terbuka SiTransparan RT/RW. Data dapat diaudit langsung oleh seluruh warga.
          </p>
        </div>
      </footer>
    </div>
  );
};
