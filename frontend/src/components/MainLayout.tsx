import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { TenantSwitcher } from '../components/TenantSwitcher';
import { OfflineBanner } from './OfflineBanner';

export const MainLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <OfflineBanner />
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-6">
          <h1 className="text-xl font-bold text-gray-900">Platform RT</h1>
          <nav className="flex space-x-4">
            <Link to="/" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Dashboard
            </Link>
            <Link to="/residents" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Data Warga
            </Link>
            <Link to="/financial" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Keuangan
            </Link>
            <Link to="/events" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Kegiatan & Budget
            </Link>
            <Link to="/aspirations" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Aspirasi & Kebutuhan
            </Link>
            <Link to="/announcements" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Pengumuman & Dokumen
            </Link>
            <Link to="/public/announcements" className="text-sm font-medium text-blue-600 hover:text-blue-900">
              Publik Pengumuman
            </Link>
            <Link to="/public/aspirations" className="text-sm font-medium text-blue-600 hover:text-blue-900">
              Publik Warga
            </Link>
            {user?.role === 'SUPER_ADMIN' && (
              <Link to="/superadmin/tenants" className="text-sm font-medium text-indigo-600 hover:text-indigo-900">
                SuperAdmin RT Management
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center space-x-4">
          <TenantSwitcher />
          <div className="text-sm text-gray-600">
            <span className="font-semibold">{user?.name}</span> ({user?.role})
          </div>
          <button
            onClick={handleLogout}
            className="rounded bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100"
          >
            Logout
          </button>
        </div>
      </header>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
};
