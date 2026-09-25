import React, { Suspense, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { prefetchRoute } from '../utils/routePrefetch';
import {
  Bell,
  Building2,
  CalendarDays,
  ChevronRight,
  Flame,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareHeart,
  Package,
  Shield,
  ShieldCheck,
  Users,
  UserCircle,
  WalletCards,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { TenantSwitcher } from '../components/TenantSwitcher';
import { OfflineBanner } from './OfflineBanner';
import { useTenantsQuery } from '../services/tenant';
import { usePublicTenantQuery } from '../services/public_tenant';
import { TenantNotFoundPage } from './TenantNotFoundPage';
import { useSwitchTenantMutation } from '../services/auth';
import { Select } from './ui/select';
import { getTenantUrl, getTenantSlugFromHost, getPlatformUrl } from '../utils/tenant';

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  adminOnly?: boolean;
  matchPrefixes?: string[];
  externalHref?: string;
};

const baseNavItems: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { 
    to: '/admin/residents', 
    label: 'Kependudukan', 
    icon: Users, 
    adminOnly: true,
    matchPrefixes: ['/admin/residents', '/admin/houses']
  },
  { 
    to: '/admin/financial', 
    label: 'Keuangan RT', 
    icon: WalletCards,
    matchPrefixes: ['/admin/financial']
  },
  { 
    to: '/admin/events', 
    label: 'Kegiatan & Rapat', 
    icon: CalendarDays,
    matchPrefixes: ['/admin/events', '/admin/meetings']
  },
  { 
    to: '/admin/announcements', 
    label: 'Komunikasi & Warga', 
    icon: MessageSquareHeart,
    matchPrefixes: ['/admin/announcements', '/admin/aspirations', '/admin/polls']
  },
  { 
    to: '/admin/karang-taruna', 
    label: 'Pemberdayaan RT', 
    icon: Flame,
    matchPrefixes: ['/admin/karang-taruna', '/admin/waste-bank', '/admin/programs']
  },
  { 
    to: '/admin/inventory', 
    label: 'Inventaris & Aset RT', 
    icon: Package,
    matchPrefixes: ['/admin/inventory']
  },
  { 
    to: '/admin/users', 
    label: 'Pengaturan & Akun', 
    icon: ShieldCheck, 
    adminOnly: true,
    matchPrefixes: ['/admin/users', '/admin/audit-logs']
  },
];

// Menu khusus warga / resident (mandiri & transparansi)
const residentNavItems: NavItem[] = [
  { to: '/admin', label: 'Dashboard Warga', icon: LayoutDashboard, end: true },
  { 
    to: '/admin/financial', 
    label: 'Iuran & Keuangan', 
    icon: WalletCards,
    matchPrefixes: ['/admin/financial']
  },
  { 
    to: '/admin/aspirations', 
    label: 'Aspirasi & Usulan', 
    icon: MessageSquareHeart,
    matchPrefixes: ['/admin/aspirations']
  },
  { 
    to: '/admin/events', 
    label: 'Agenda Kegiatan', 
    icon: CalendarDays,
    matchPrefixes: ['/admin/events', '/admin/meetings']
  },
  { 
    to: '/admin/announcements', 
    label: 'Kabar & Dokumen', 
    icon: Bell,
    matchPrefixes: ['/admin/announcements', '/admin/polls']
  },
  { 
    to: '/admin/waste-bank', 
    label: 'Tabungan Sampah', 
    icon: Flame,
    matchPrefixes: ['/admin/waste-bank', '/admin/karang-taruna']
  },
  { 
    to: '/admin/inventory', 
    label: 'Pinjam Inventaris RT', 
    icon: Package,
    matchPrefixes: ['/admin/inventory']
  },
  { 
    to: '/admin/profile', 
    label: 'Profil Akun Saya', 
    icon: UserCircle,
    matchPrefixes: ['/admin/profile']
  },
];

const publicNavItems: NavItem[] = [
  { to: '/', label: 'Portal Transparansi', icon: Bell, end: true },
];

const SuperAdminTenantSwitchCard: React.FC = () => {
  const { user } = useAuthStore();
  const isSuper = user?.role === 'SUPER_ADMIN' || String(user?.role).toLowerCase().replace('-', '_') === 'superadmin' || String(user?.role).toLowerCase() === 'super_admin';
  const { data: tenants } = useTenantsQuery({ enabled: isSuper });
  const { activeTenant, setAuth } = useAuthStore();
  const switchTenantMutation = useSwitchTenantMutation();
  const handleSwitch = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tenant = tenants?.find((t) => t.id === e.target.value);
    if (!tenant) return;
    try {
      const switched = await switchTenantMutation.mutateAsync(tenant.id);
      const nextUser = { ...switched.user, role: (switched.user.role || user?.role) as any, tenants: (user as any)?.tenants };
      setAuth(switched.token, nextUser as any, tenant as any);
      window.location.href = getTenantUrl(tenant.slug, '/admin');
    } catch {}
  };
  if (!tenants || tenants.length === 0) {
    return (
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-2xl bg-emerald-400/15 p-2 text-emerald-200"><Building2 className="h-5 w-5" /></div>
        <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Tenant Aktif</p><p className="mt-1 truncate text-sm font-bold">{activeTenant?.name || 'Platform'}</p><p className="text-xs text-slate-400">{(activeTenant as any)?.slug || 'superadmin'}</p></div>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="rounded-2xl bg-emerald-400/15 p-2 text-emerald-200"><Building2 className="h-5 w-5" /></div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Tenant Aktif (SuperAdmin)</p>
      </div>
      <Select
        value={activeTenant?.id || ''}
        onValueChange={(val) => {
          const t = tenants.find((item) => item.id === val);
          if (t) handleSwitch({ target: { value: val } } as any);
        }}
        disabled={switchTenantMutation.isPending}
        className="w-full rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-white/30"
      >
        <option value="" disabled className="text-slate-900">Pilih RT untuk masuk...</option>
        {tenants.map((tenant) => (
          <option key={tenant.id} value={tenant.id} className="text-slate-900">{tenant.name} ({tenant.slug})</option>
        ))}
      </Select>
      <p className="text-[11px] text-slate-400">Pilih RT → masuk sebagai superadmin ke tenant. Aktif: <span className="text-white font-bold">{activeTenant?.name || 'Platform'}</span></p>
    </div>
  );
};

export const MainLayout: React.FC = () => {
  const { user, logout, activeTenant } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const hostSlug = (() => { try { return getTenantSlugFromHost(); } catch { return null; } })();
  const { data: tenantInfo, isLoading: isTenantLoading, isError: isTenantError } = usePublicTenantQuery();

  React.useEffect(() => {
    if (!hostSlug || !user || !activeTenant) return;
    const isSuper = String(user.role).toLowerCase().replace('-','_') === 'superadmin' || String(user.role).toLowerCase() === 'super_admin';
    if (isSuper) return;
    const allowedSlugs = (user.tenants || []).map((t: any) => t.slug);
    const isAllowed = allowedSlugs.includes(hostSlug);
    const isMismatch = hostSlug !== (activeTenant as any).slug;
    if (!isAllowed || isMismatch) {
      const correct = (activeTenant as any).slug;
      if (correct && correct !== hostSlug) {
        window.location.href = getTenantUrl(correct, window.location.pathname + window.location.search);
      }
    }
  }, [user?.id, activeTenant?.id]);

  const navItems = useMemo(() => {
    const isSuperAdmin =
      user?.role === 'SUPER_ADMIN' ||
      (user?.role as string) === 'superadmin' ||
      (user?.role as string) === 'super_admin';
    const isAdminRT =
      user?.role === 'RT_ADMIN' || (user?.role as string) === 'admin_rt';
    const isOperator = (user?.role as string)?.toLowerCase() === 'operator';

    const hostSlug = (() => { try { return getTenantSlugFromHost(); } catch { return null; } })();
    const isInTenant = Boolean(isSuperAdmin && hostSlug);

    if (isSuperAdmin && isInTenant) {
      return [
        { to: '/admin', label: 'Dashboard (Support)', icon: LayoutDashboard, end: true },
        ...baseNavItems.filter((item) => item.to !== '/admin'),
        { to: '/admin/tenants', label: '← Kembali Platform', icon: Shield, externalHref: getPlatformUrl('/admin/tenants') },
      ];
    }

    if (isSuperAdmin) {
      return [
        { to: '/admin/tenants', label: 'SuperAdmin RT', icon: Shield },
        { to: '/admin/users', label: 'Manajemen Pengguna', icon: Users },
        { to: '/', label: 'Landing Page Platform', icon: Bell, end: true },
      ];
    }

    if (isOperator) {
      // Role operator: semua modul operasional RT, kecuali Pengaturan & Akun
      return [
        ...baseNavItems.filter((item) => item.to !== '/admin/users'),
        ...publicNavItems,
      ];
    }

    if (!isAdminRT) {
      // Role resident / warga
      return [
        ...residentNavItems,
        ...publicNavItems,
      ];
    }

    const items = [
      ...baseNavItems,
      ...publicNavItems,
    ];
    return items;
  }, [user?.role, activeTenant?.id]);

  const handleLogout = () => {
    logout();
    // Hard reload to ensure no stale Zustand/memo survives across role switch
    window.location.href = '/login';
  };

  const location = useLocation();

  if (hostSlug && !isTenantLoading && (isTenantError || tenantInfo === null)) {
    return <TenantNotFoundPage />;
  }

  const renderNavigation = () => (
    <nav className="mt-4 space-y-1 px-3">
      {navItems.map(({ to, label, icon: Icon, end, matchPrefixes, externalHref }) => {
        const isMatched = matchPrefixes
          ? matchPrefixes.some((prefix) => location.pathname.startsWith(prefix))
          : end
          ? location.pathname === to
          : location.pathname.startsWith(to);

        if (externalHref) {
          return (
            <a
              key={to}
              href={externalHref}
              onClick={() => setSidebarOpen(false)}
              className="group flex items-center gap-3 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-colors text-[#707070] hover:bg-[#f5f5f7] hover:text-[#1d1d1f] focus:outline-none"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#f5f5f7] text-[#707070] group-hover:text-[#0071e3] transition-colors">
                <Icon className="h-4 w-4" />
              </span>
              <span className="flex-1 truncate">{label}</span>
              <ChevronRight className="h-3.5 w-3.5 transition-transform -translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-60" />
            </a>
          );
        }

        return (
          <NavLink
            key={to}
            to={to}
            end={end}
            onMouseEnter={() => prefetchRoute(to)}
            onFocus={() => prefetchRoute(to)}
            onClick={() => setSidebarOpen(false)}
            className={
              [
                'group flex items-center gap-3 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-all duration-150',
                'focus:outline-none',
                isMatched
                  ? 'bg-[#f4f8fb] text-[#0066cc] font-semibold border border-[#d2d2d7]'
                  : 'text-[#707070] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]',
              ].join(' ')
            }
          >
            <span
              className={[
                'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                isMatched ? 'bg-white text-[#0071e3] shadow-2xs' : 'bg-transparent text-[#707070] group-hover:text-[#1d1d1f]',
              ].join(' ')}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="flex-1 truncate">{label}</span>
            <ChevronRight className={['h-3.5 w-3.5 transition-transform', isMatched ? 'translate-x-0 text-[#0071e3]' : '-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-60'].join(' ')} />
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] antialiased">
      <OfflineBanner />

      {sidebarOpen && (
        <button
          aria-label="Tutup menu"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 flex w-72 max-w-[86vw] flex-col bg-white border-r border-[#d2d2d7] transition-transform duration-300 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="relative flex h-full flex-col min-h-0">
          <div className="flex items-center justify-between px-5 pt-5 shrink-0 border-b border-[#d2d2d7] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f5f5f7] text-[#0071e3] border border-[#d2d2d7] shadow-2xs">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#707070]">SiTransparan</p>
                <h1 className="text-base font-semibold tracking-tight text-[#1d1d1f]">RT/RW Admin</h1>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-1.5 text-[#707070] transition hover:bg-[#f5f5f7] hover:text-[#1d1d1f] lg:hidden"
              aria-label="Tutup sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mx-4 mt-4 shrink-0 rounded-lg border border-[#d2d2d7] bg-[#f5f5f7] p-3 text-[#1d1d1f]">
            {(() => {
              const isSuper = user?.role === 'SUPER_ADMIN' || String(user?.role).toLowerCase().replace('-','_') === 'superadmin' || String(user?.role).toLowerCase() === 'super_admin';
              if (!isSuper) {
                return (
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 rounded-md bg-white p-1.5 text-[#0071e3] border border-[#d2d2d7]">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#707070]">Tenant Aktif</p>
                      <p className="mt-0.5 truncate text-xs font-semibold text-[#1d1d1f]">{activeTenant?.name || 'Pilih RT'}</p>
                      <p className="text-[10px] text-[#707070]">{activeTenant?.code || (activeTenant as any)?.slug || 'Belum tersedia'}</p>
                    </div>
                  </div>
                );
              }
              return <SuperAdminTenantSwitchCard />;
            })()}
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 py-2">
            {renderNavigation()}
          </div>

          <div className="mt-auto p-3 shrink-0 border-t border-[#d2d2d7]">
            <div className="rounded-lg border border-[#d2d2d7] bg-[#f5f5f7] p-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-semibold text-[#1d1d1f] truncate">{user?.name || 'Pengguna'}</p>
                  <p className="mt-0.5 text-[10px] font-medium text-[#707070]">
                    {(() => {
                      const role = String(user?.role || '').toLowerCase();
                      if (role === 'resident') return 'Warga RT (Resident)';
                      if (role === 'admin_rt' || role === 'rt_admin') return 'Pengurus RT (Admin)';
                      if (role.includes('super')) return 'Super Admin Platform';
                      return user?.role || 'ROLE';
                    })()}
                  </p>
                </div>
                <NavLink
                  to="/admin/profile"
                  className="rounded-lg p-1.5 text-[#707070] hover:bg-white hover:text-[#1d1d1f] transition border border-transparent hover:border-[#d2d2d7]"
                  title="Edit Profil"
                >
                  <UserCircle className="h-4.5 w-4.5" />
                </NavLink>
              </div>
              <button
                onClick={handleLogout}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-white border border-[#d2d2d7] px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50 hover:border-rose-200 active:scale-[0.98]"
              >
                <LogOut className="h-3.5 w-3.5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-[#d2d2d7] bg-white/80 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-lg border border-[#d2d2d7] bg-white p-2 text-[#1d1d1f] shadow-2xs transition hover:bg-[#f5f5f7] lg:hidden"
                aria-label="Buka sidebar"
              >
                <Menu className="h-4 w-4" />
              </button>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#707070]">
                  {String(user?.role || '').toLowerCase() === 'resident' ? 'Layanan Warga RT' : 'Administrasi Warga'}
                </p>
                <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[#1d1d1f]">SiTransparan RT/RW</h2>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:block">
                <TenantSwitcher />
              </div>
              <NavLink
                to="/admin/profile"
                className="hidden rounded-lg border border-[#d2d2d7] bg-white px-3 py-1.5 shadow-2xs md:flex items-center gap-2 hover:bg-[#f5f5f7] transition text-xs"
                title="Kelola Profil Saya"
              >
                <div>
                  <p className="text-[10px] text-[#707070]">Masuk sebagai</p>
                  <p className="font-semibold text-[#1d1d1f]">{user?.name} · {user?.role}</p>
                </div>
                <UserCircle className="h-4 w-4 text-[#707070]" />
              </NavLink>
            </div>
          </div>
          <div className="mt-2.5 sm:hidden">
            <TenantSwitcher />
          </div>
        </header>

        <main className="mx-auto min-h-[calc(100vh-4rem)] w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <Suspense
            fallback={
              <div className="space-y-4 animate-pulse">
                <div className="h-8 w-44 rounded-lg bg-[#e2e2e5]" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="h-24 rounded-lg bg-[#e2e2e5]" />
                  <div className="h-24 rounded-lg bg-[#e2e2e5]" />
                  <div className="h-24 rounded-lg bg-[#e2e2e5]" />
                </div>
                <div className="h-64 rounded-lg bg-[#e2e2e5]" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
};
