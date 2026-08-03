import React, { useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Bell,
  Building2,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareHeart,
  Shield,
  Users,
  WalletCards,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { TenantSwitcher } from '../components/TenantSwitcher';
import { OfflineBanner } from './OfflineBanner';

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
};

const baseNavItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/residents', label: 'Data Warga', icon: Users },
  { to: '/financial', label: 'Keuangan', icon: WalletCards },
  { to: '/events', label: 'Kegiatan & Budget', icon: CalendarDays },
  { to: '/aspirations', label: 'Aspirasi & Kebutuhan', icon: MessageSquareHeart },
  { to: '/announcements', label: 'Pengumuman & Dokumen', icon: FileText },
];

const publicNavItems: NavItem[] = [
  { to: '/public/announcements', label: 'Publik Pengumuman', icon: Bell },
  { to: '/public/aspirations', label: 'Publik Warga', icon: ClipboardList },
];

export const MainLayout: React.FC = () => {
  const { user, logout, activeTenant } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = useMemo(() => {
    const items = [...baseNavItems, ...publicNavItems];
    if (user?.role === 'SUPER_ADMIN') {
      items.push({ to: '/superadmin/tenants', label: 'SuperAdmin RT', icon: Shield });
    }
    return items;
  }, [user?.role]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const renderNavigation = () => (
    <nav className="mt-8 space-y-1.5 px-3">
      {navItems.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={() => setSidebarOpen(false)}
          className={({ isActive }) =>
            [
              'group flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition-all duration-200',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
              isActive
                ? 'bg-white text-indigo-700 shadow-lg shadow-indigo-950/10 ring-1 ring-indigo-100'
                : 'text-slate-400 hover:bg-white/10 hover:text-white',
            ].join(' ')
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={[
                  'flex h-9 w-9 items-center justify-center rounded-xl transition-colors',
                  isActive ? 'bg-indigo-50 text-indigo-600' : 'bg-white/5 text-slate-300 group-hover:bg-white/10 group-hover:text-white',
                ].join(' ')}
              >
                <Icon className="h-4.5 w-4.5" />
              </span>
              <span className="flex-1 truncate">{label}</span>
              <ChevronRight className={['h-4 w-4 transition-transform', isActive ? 'translate-x-0 text-indigo-400' : '-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-70'].join(' ')} />
            </>
          )}
        </NavLink>
      ))}
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
          'fixed inset-y-0 left-0 z-40 flex w-80 max-w-[86vw] flex-col overflow-hidden bg-slate-950 transition-transform duration-300 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-br from-indigo-500/25 via-sky-500/10 to-transparent" />
        <div className="relative flex h-full flex-col">
          <div className="flex items-center justify-between px-6 pt-6">
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

          <div className="mx-6 mt-6 rounded-3xl border border-white/10 bg-white/10 p-4 text-white shadow-2xl shadow-slate-950/20 backdrop-blur">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-2xl bg-emerald-400/15 p-2 text-emerald-200">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Tenant Aktif</p>
                <p className="mt-1 truncate text-sm font-bold">{activeTenant?.name || 'Pilih RT'}</p>
                <p className="text-xs text-slate-400">{activeTenant?.code || 'Belum tersedia'}</p>
              </div>
            </div>
          </div>

          {renderNavigation()}

          <div className="mt-auto p-4">
            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
              <p className="text-sm font-bold text-white">{user?.name || 'Pengguna'}</p>
              <p className="mt-1 text-xs font-medium text-slate-400">{user?.role || 'ROLE'}</p>
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
              <div className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm md:block">
                <p className="text-xs font-medium text-slate-500">Masuk sebagai</p>
                <p className="text-sm font-bold text-slate-900">{user?.name} · {user?.role}</p>
              </div>
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
