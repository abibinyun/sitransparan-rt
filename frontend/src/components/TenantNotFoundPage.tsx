import React from 'react';
import { Building2 } from 'lucide-react';
import { getPlatformUrl } from '../utils/tenant';

interface TenantNotFoundPageProps {
  title?: string;
  description?: string;
}

export const TenantNotFoundPage: React.FC<TenantNotFoundPageProps> = ({
  title = 'Lingkungan RT Tidak Ditemukan (404)',
  description = 'Subdomain ini belum terdaftar atau telah dinonaktifkan dari sistem transparansi.',
}) => {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mb-4">
        <Building2 className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold mb-2">{title}</h1>
      <p className="text-slate-400 max-w-md mb-6 text-sm">
        {description}
      </p>
      <button
        onClick={() => {
          window.location.href = getPlatformUrl('/');
        }}
        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-all shadow-lg shadow-emerald-900/30"
      >
        Kembali ke Beranda Utama
      </button>
    </div>
  );
};
