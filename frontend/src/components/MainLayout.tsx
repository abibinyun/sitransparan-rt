import React, { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Bell,
  Building2,
  CalendarDays,
  ChevronRight,
  Flame,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareHeart,
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
    to: '/admin/users', 
    label: 'Pengaturan & Akun', 
    icon: ShieldCheck, 
    adminOnly: true,
    matchPrefixes: ['/admin/users', '/admin/audit-logs']
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
      <select
        value={activeTenant?.id || ''}
        onChange={handleSwitch}
        disabled={switchTenantMutation.isPending}
        className="w-full rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-white/30"
      >
        <option value="" disabled className="text-slate-900">Pilih RT untuk masuk...</option>
        {tenants.map((tenant) => (
          <option key={tenant.id} value={tenant.id} className="text-slate-900">{tenant.name} ({tenant.slug})</option>
        ))}
      </select>
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

    const items = [
      ...baseNavItems.filter((item) => !item.adminOnly || isAdminRT),
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
    <nav className="mt-8 space-y-1.5 px-3">
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
              className="group flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition-all duration-200 text-slate-400 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-300 group-hover:bg-white/10 group-hover:text-white transition-colors">
                <Icon className="h-4.5 w-4.5" />
              </span>
              <span className="flex-1 truncate">{label}</span>
              <ChevronRight className="h-4 w-4 transition-transform -translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-70" />
            </a>
          );
        }

        return (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setSidebarOpen(false)}
            className={
              [
                'group flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition-all duration-200',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
                isMatched
                  ? 'bg-white text-indigo-700 shadow-lg shadow-indigo-950/10 ring-1 ring-indigo-100'
                  : 'text-slate-400 hover:bg-white/10 hover:text-white',
              ].join(' ')
            }
          >
            <span
              className={[
                'flex h-9 w-9 items-center justify-center rounded-xl transition-colors',
                isMatched ? 'bg-indigo-50 text-indigo-600' : 'bg-white/5 text-slate-300 group-hover:bg-white/10 group-hover:text-white',
              ].join(' ')}
            >
              <Icon className="h-4.5 w-4.5" />
            </span>
            <span className="flex-1 truncate">{label}</span>
            <ChevronRight className={['h-4 w-4 transition-transform', isMatched ? 'translate-x-0 text-indigo-400' : '-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-70'].join(' ')} />
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 antialiased">
      <OfflineBanner />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.16),transparent_32rem),radial-gradient(circle_at_80%_10%,rgba(20,184,166,0.12),transparent_28rem)]" />

      {sidebarOpen && (
        <button
          aria-label="Tutup menu"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 flex w-80 max-w-[86vw] flex-col bg-slate-950 transition-transform duration-300 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-br from-indigo-500/25 via-sky-500/10 to-transparent pointer-events-none" />
        <div className="relative flex h-full flex-col min-h-0">
          <div className="flex items-center justify-between px-6 pt-6 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-indigo-700 shadow-xl shadow-indigo-950/20">
                <Home className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-indigo-200">Platform</p>
                <h1 className="text-xl font-black tracking-tight text-white">RT App</h1>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-xl p-2 text-slate-300 transition hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Tutup sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mx-6 mt-6 shrink-0 rounded-3xl border border-white/10 bg-white/10 p-4 text-white shadow-2xl shadow-slate-950/20 backdrop-blur">
            {(() => {
              const isSuper = user?.role === 'SUPER_ADMIN' || String(user?.role).toLowerCase().replace('-','_') === 'superadmin' || String(user?.role).toLowerCase() === 'super_admin';
              if (!isSuper) {
                return (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-2xl bg-emerald-400/15 p-2 text-emerald-200">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Tenant Aktif</p>
                      <p className="mt-1 truncate text-sm font-bold">{activeTenant?.name || 'Pilih RT'}</p>
                      <p className="text-xs text-slate-400">{activeTenant?.code || (activeTenant as any)?.slug || 'Belum tersedia'}</p>
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

          <div className="mt-auto p-4 shrink-0">
            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <p className="text-sm font-bold text-white truncate">{user?.name || 'Pengguna'}</p>
                  <p className="mt-0.5 text-xs font-medium text-slate-400">{user?.role || 'ROLE'}</p>
                </div>
                <NavLink
                  to="/admin/profile"
                  className="rounded-xl p-2 text-indigo-200 hover:bg-white/10 hover:text-white transition"
                  title="Edit Profil"
                >
                  <UserCircle className="h-5 w-5" />
                </NavLink>
              </div>
              <button
                onClick={handleLogout}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-500/10 px-4 py-2.5 text-sm font-bold text-rose-100 transition hover:bg-rose-500 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-80">
        <header className="sticky top-0 z-20 border-b border-white/70 bg-white/75 px-4 py-3 shadow-sm shadow-slate-200/60 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-600 hover:shadow-md lg:hidden"
                aria-label="Buka sidebar"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Administrasi Warga</p>
                <h2 className="text-lg font-black tracking-tight text-slate-950 sm:text-2xl">Platform RT App</h2>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:block">
                <TenantSwitcher />
              </div>
              <NavLink
                to="/admin/profile"
                className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm md:flex items-center gap-2.5 hover:border-indigo-200 hover:shadow transition"
                title="Kelola Profil Saya"
              >
                <div>
                  <p className="text-xs font-medium text-slate-500">Masuk sebagai</p>
                  <p className="text-sm font-bold text-slate-900">{user?.name} · {user?.role}</p>
                </div>
                <UserCircle className="h-5 w-5 text-slate-400" />
              </NavLink>
            </div>
          </div>
          <div className="mt-3 sm:hidden">
            <TenantSwitcher />
          </div>
        </header>

        <main className="mx-auto min-h-[calc(100vh-5rem)] w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
