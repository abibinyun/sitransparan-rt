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
  TrendingUp,
  Users,
  CheckCircle2,
  Menu,
  X
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { usePublicTenantQuery } from '../services/public_tenant';

export const PublicLayout: React.FC = () => {
  const { user } = useAuthStore();
  const { data: tenantInfo } = usePublicTenantQuery();
  const isAuthenticated = Boolean(user);
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const tenantName = tenantInfo?.name || 'Portal RT';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Announcement & Quick Stats Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white text-xs py-2 px-4 shadow-inner">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2 font-medium">
            <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> System Live
            </span>
            <span>Portal Transparansi {tenantName} - Terbuka & Akuntabel</span>
          </div>
          <div className="flex items-center gap-4 text-slate-300 text-[11px]">
            <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-emerald-400" /> Kas RT: Rp 18.450.000</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-indigo-400" /> 12 Aspirasi Selesai</span>
            <span className="flex items-center gap-1"><Users className="w-3 h-3 text-sky-400" /> 142 Kepala Keluarga</span>
          </div>
        </div>
      </div>

      {/* Main Public Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/public/announcements" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform font-bold text-lg">
                {tenantInfo?.logo_url ? (
                  <img src={tenantInfo.logo_url} alt={tenantName} className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <Building2 className="w-5 h-5" />
                )}
              </div>
              <div>
                <span className="font-extrabold text-lg text-slate-900 tracking-tight block leading-tight uppercase">{tenantName}</span>
                <span className="text-[11px] font-semibold text-indigo-600 tracking-wider uppercase block">Portal Transparansi Warga</span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
              <NavLink
                to="/public/announcements"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
                      : 'text-slate-600 hover:text-indigo-600 hover:bg-white/50'
                  }`
                }
              >
                <FileText className="w-4 h-4" />
                Pengumuman & Dokumen
              </NavLink>
              <NavLink
                to="/public/aspirations"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
                      : 'text-slate-600 hover:text-indigo-600 hover:bg-white/50'
                  }`
                }
              >
                <MessageSquareHeart className="w-4 h-4" />
                Aspirasi & Kebutuhan
              </NavLink>
              <NavLink
                to="/public/events"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
                      : 'text-slate-600 hover:text-indigo-600 hover:bg-white/50'
                  }`
                }
              >
                <CalendarDays className="w-4 h-4" />
                Agenda & Kegiatan
              </NavLink>
            </nav>

            {/* Actions (Login / Portal Internal) */}
            <div className="hidden sm:flex items-center gap-3">
              {isAuthenticated ? (
                <button
                  onClick={() => navigate('/')}
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-indigo-200 transition-all hover:-translate-y-0.5"
                >
                  <Building2 className="w-4 h-4" /> Dashboard Pengurus
                </button>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 px-3.5 py-2 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    <LogIn className="w-4 h-4" /> Masuk Warga
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-indigo-200 transition-all hover:-translate-y-0.5"
                  >
                    <UserPlus className="w-4 h-4" /> Daftar Akun
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="flex md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-slate-600 hover:bg-slate-100"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-4 space-y-2">
            <NavLink
              to="/public/announcements"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              <FileText className="w-4 h-4 text-indigo-600" /> Pengumuman & Dokumen
            </NavLink>
            <NavLink
              to="/public/aspirations"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              <MessageSquareHeart className="w-4 h-4 text-indigo-600" /> Aspirasi & Kebutuhan
            </NavLink>
            <NavLink
              to="/public/events"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              <CalendarDays className="w-4 h-4 text-indigo-600" /> Agenda & Kegiatan
            </NavLink>
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center bg-indigo-600 text-white font-semibold text-sm py-2.5 rounded-xl shadow-sm"
              >
                Masuk / Daftar Akun
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Public Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-10 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 text-white font-bold text-base mb-3">
              <Building2 className="w-5 h-5 text-indigo-400" /> SITRANSPARAN RT 05
            </div>
            <p className="text-slate-400 leading-relaxed">
              Platform keterbukaan informasi publik dan akuntabilitas pengelolaan fasilitas, keuangan, serta aspirasi warga lingkungan RT 05 / RW 02.
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold text-sm mb-3">Layanan Warga</h4>
            <ul className="space-y-2">
              <li><Link to="/public/announcements" className="hover:text-white transition-colors">Surat Edaran & Laporan Keuangan</Link></li>
              <li><Link to="/public/aspirations" className="hover:text-white transition-colors">Kirim Usulan & Keluhan Lingkungan</Link></li>
              <li><Link to="/public/events" className="hover:text-white transition-colors">Jadwal Posyandu & Kerja Bakti</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold text-sm mb-3">Sekretariat RT</h4>
            <p className="text-slate-400 leading-relaxed">
              Balai Warga RT 05 / RW 02<br />
              Jl. Mawar Merah No. 12<br />
              Email: pengurus@rt05rw02.id
            </p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 mt-8 border-t border-slate-800 text-center text-slate-500">
          © {new Date().getFullYear()} SITRANSPARAN RT. Sistem Transparansi Lingkungan Warga.
        </div>
      </footer>
    </div>
  );
};
