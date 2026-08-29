import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  wasteBankService, 
  WasteCategory, 
  WasteBankSummary 
} from '../services/wasteBank';
import { 
  Recycle, 
  Scale, 
  Coins, 
  Sparkles, 
  Users, 
  Info,
} from 'lucide-react';
import { formatRupiah } from '../services/public_transparency';
import { getTenantSlugOrFallback } from '../utils/tenant';

export const PublicWasteBankPage: React.FC = () => {
  const tenantSlug = getTenantSlugOrFallback();

  const { data: summary } = useQuery<WasteBankSummary>({
    queryKey: ['publicWasteSummary', tenantSlug],
    queryFn: () => wasteBankService.getPublicSummary(tenantSlug),
    enabled: Boolean(tenantSlug),
  });

  const { data: categories, isLoading: isCategoriesLoading } = useQuery<WasteCategory[]>({
    queryKey: ['publicWasteCategories', tenantSlug],
    queryFn: () => wasteBankService.getPublicCategories(tenantSlug),
    enabled: Boolean(tenantSlug),
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-900/10">
        <div className="relative z-10 max-w-xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold tracking-wide text-emerald-100 border border-white/10">
            <Recycle className="w-3.5 h-3.5" /> Program Lingkungan Berkelanjutan
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Bank Sampah Warga & Pemuda
          </h1>
          <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed">
            Setorkan sampah anorganik terpilah keluarga Anda. Dapatkan tabungan saldo warga langsung dan dukung kas operasional pemuda Karang Taruna!
          </p>
        </div>

        {/* Decorative graphic */}
        <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 text-white/10 pointer-events-none">
          <Recycle className="w-64 h-64" />
        </div>
      </div>

      {/* KPI Transparansi Publik */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl w-fit mb-3">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Terkumpul</p>
            <p className="text-lg sm:text-2xl font-bold text-slate-800">
              {summary ? (summary.total_weight_kg || 0).toLocaleString('id-ID') : 0} <span className="text-xs font-normal text-slate-400">kg</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl w-fit mb-3">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Partisipasi KK</p>
            <p className="text-lg sm:text-2xl font-bold text-slate-800">
              {summary ? (summary.active_households_count || 0) : 0} <span className="text-xs font-normal text-slate-400">Keluarga</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl w-fit mb-3">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Saldo Salur Warga</p>
            <p className="text-lg sm:text-2xl font-bold text-amber-600">
              {formatRupiah(summary?.total_resident_earnings || 0)}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl w-fit mb-3">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Kas Karang Taruna</p>
            <p className="text-lg sm:text-2xl font-bold text-purple-600">
              {formatRupiah(summary?.total_karang_taruna_share || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Cara Kerja / Alur */}
      <div className="bg-slate-50 border border-slate-200/75 rounded-2xl p-5 sm:p-6 space-y-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2 text-base">
          <Info className="w-5 h-5 text-emerald-600" />
          Bagaimana Cara Menyetor Sampah?
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="bg-white p-4 rounded-xl border border-slate-200/50 shadow-xs">
            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center mb-2">1</span>
            <p className="font-semibold text-slate-800 mb-1">Pilah dari Rumah</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Pisahkan sampah anorganik (kardus, botol plastik, kaleng, kertas) dalam kondisi bersih dan kering.
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/50 shadow-xs">
            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center mb-2">2</span>
            <p className="font-semibold text-slate-800 mb-1">Bawa ke Pos Penimbangan</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Pengurus pemuda Karang Taruna akan menimbang dan mencatat nominal setoran langsung ke akun KK Anda.
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/50 shadow-xs">
            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center mb-2">3</span>
            <p className="font-semibold text-slate-800 mb-1">Bagi Hasil Otomatis</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Sebagian besar menjadi hak saldo warga, dan persentase sisanya masuk kas operasional pemuda.
            </p>
          </div>
        </div>
      </div>

      {/* Katalog Harga Sampah Terkini */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Daftar Harga & Kategori Sampah</h2>
            <p className="text-xs text-slate-500">Estimasi nilai tukar per kilogram di lingkungan kita</p>
          </div>
        </div>

        {isCategoriesLoading ? (
          <div className="py-8 text-center text-slate-400">Memuat daftar harga...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {(categories || []).map((c) => (
              <div key={c.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:border-emerald-200 transition">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-slate-800 text-sm">{c.name}</h3>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-lg whitespace-nowrap">
                      {formatRupiah(c.price_per_unit || 0)} / {c.unit}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-amber-600 font-medium">Warga: {c.resident_share_pct}%</span>
                  <span className="text-purple-600 font-medium">Pemuda: {c.karang_taruna_share_pct}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicWasteBankPage;
