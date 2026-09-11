import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Recycle,
  Users,
  Flame,
  Scale,
  Sparkles,
  Info,
  Calculator,
  Coins
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { wasteBankService, WasteCategory, WasteBankSummary } from '../services/wasteBank';
import { formatRupiah } from '../services/public_transparency';
import { getTenantSlugOrFallback } from '../utils/tenant';
import { PublicKarangTarunaPage } from './PublicKarangTarunaPage';

type ProgramTab = 'waste' | 'environment';

export const PublicProgramsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as ProgramTab) || 'waste';
  const [activeTab, setActiveTab] = useState<ProgramTab>(
    ['waste', 'environment'].includes(initialTab) ? initialTab : 'waste'
  );

  const handleTabChange = (tab: ProgramTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const tenantSlug = getTenantSlugOrFallback();

  const { data: summary } = useQuery<WasteBankSummary>({
    queryKey: ['publicWasteSummary', tenantSlug],
    queryFn: () => wasteBankService.getPublicSummary(tenantSlug),
    enabled: Boolean(tenantSlug) && activeTab === 'waste',
  });

  const { data: categories } = useQuery<WasteCategory[]>({
    queryKey: ['publicWasteCategories', tenantSlug],
    queryFn: () => wasteBankService.getPublicCategories(tenantSlug),
    enabled: Boolean(tenantSlug) && activeTab === 'waste',
  });

  // State untuk Kalkulator Simulasi Tabungan Sampah Warga
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [inputWeight, setInputWeight] = useState<number | string>(5);

  const selectedCategory = (categories || []).find((c) => c.id === selectedCategoryId) || categories?.[0];
  const weightNum = Number(inputWeight) || 0;
  const estimatedTotal = selectedCategory ? weightNum * selectedCategory.price_per_unit : 0;
  const residentShare = selectedCategory ? (estimatedTotal * selectedCategory.resident_share_pct) / 100 : 0;
  const youthShare = selectedCategory ? (estimatedTotal * selectedCategory.karang_taruna_share_pct) / 100 : 0;

  return (
    <div className="pb-16 space-y-8">
      {/* Hero Section */}
      <section className="bg-slate-900 text-white px-4 sm:px-6 py-10 sm:py-14 border-b border-slate-800">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold px-3 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Inisiatif Warga &amp; Komunitas
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Program Kerja &amp; Pemberdayaan Lingkungan
          </h1>
          <p className="max-w-2xl text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
            Kumpulan inisiatif terpadu RT: gerakan ekonomi sirkular Bank Sampah, penghijauan lingkungan, kemandirian pemuda, serta agenda program berkelanjutan.
          </p>

          {/* Navigation Tabs */}
          <div className="pt-2 flex flex-wrap gap-2">
            <button
              onClick={() => handleTabChange('waste')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'waste'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Recycle className="w-4 h-4" /> Bank Sampah
            </button>
            <button
              onClick={() => handleTabChange('environment')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'environment'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Flame className="w-4 h-4" /> Kepemudaan &amp; Organisasi
            </button>
          </div>
        </div>
      </section>

      {/* Tab 1: Bank Sampah */}
      {activeTab === 'waste' && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
          {/* Live KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="civic-card p-4 sm:p-5 flex flex-col justify-between">
              <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl w-fit mb-2">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Total Sampah Terkelola
                </span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums">
                  {summary?.total_weight_kg ? `${summary.total_weight_kg.toLocaleString('id-ID')} kg` : '0 kg'}
                </span>
              </div>
            </div>

            <div className="civic-card p-4 sm:p-5 flex flex-col justify-between">
              <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl w-fit mb-2">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Nilai Ekonomi Warga
                </span>
                <span className="text-xl sm:text-2xl font-black text-emerald-700 tabular-nums">
                  {formatRupiah(summary?.total_resident_earnings || 0)}
                </span>
              </div>
            </div>

            <div className="civic-card p-4 sm:p-5 flex flex-col justify-between">
              <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl w-fit mb-2">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Kas Pemuda Didukung
                </span>
                <span className="text-xl sm:text-2xl font-black text-indigo-700 tabular-nums">
                  {formatRupiah(summary?.total_karang_taruna_share || 0)}
                </span>
              </div>
            </div>

            <div className="civic-card p-4 sm:p-5 flex flex-col justify-between">
              <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl w-fit mb-2">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Warga Berpartisipasi
                </span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums">
                  {summary?.active_households_count ? `${summary.active_households_count} KK` : '0 KK'}
                </span>
              </div>
            </div>
          </div>

          {/* Simulasi Kalkulator Tabungan */}
          <div className="civic-card p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Calculator className="w-5 h-5 text-emerald-700" />
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                Simulasi Tabungan Setoran Sampah
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Pilih Kategori Sampah</label>
                <select
                  value={selectedCategory?.id || ''}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  {(categories || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({formatRupiah(c.price_per_unit)}/{c.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Estimasi Berat ({selectedCategory?.unit || 'kg'})
                </label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={inputWeight}
                  onChange={(e) => setInputWeight(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  placeholder="Contoh: 5"
                />
              </div>
            </div>

            {selectedCategory && (
              <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200/80 p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Nilai Kotor Total
                  </span>
                  <span className="text-base font-extrabold text-slate-800">
                    {formatRupiah(estimatedTotal)}
                  </span>
                </div>
                <div className="border-t sm:border-t-0 sm:border-l border-emerald-200/60 pt-2 sm:pt-0">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                    Masuk Tabungan Anda ({selectedCategory.resident_share_pct}%)
                  </span>
                  <span className="text-lg font-black text-emerald-700">
                    {formatRupiah(residentShare)}
                  </span>
                </div>
                <div className="border-t sm:border-t-0 sm:border-l border-emerald-200/60 pt-2 sm:pt-0">
                  <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">
                    Dukungan Kas Pemuda ({selectedCategory.karang_taruna_share_pct}%)
                  </span>
                  <span className="text-lg font-black text-indigo-700">
                    {formatRupiah(youthShare)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Daftar Kategori & Harga Terbuka */}
          <div className="space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-600" />
              Daftar Harga &amp; Rasio Bagi Hasil
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(categories || []).map((cat) => (
                <div key={cat.id} className="civic-card p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{cat.name}</h4>
                      <span className="text-xs text-slate-500">Satuan: {cat.unit}</span>
                    </div>
                    <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                      {formatRupiah(cat.price_per_unit)}/{cat.unit}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 flex items-center justify-between pt-2 border-t border-slate-100">
                    <span>Warga: <strong>{cat.resident_share_pct}%</strong></span>
                    <span>Pemuda: <strong>{cat.karang_taruna_share_pct}%</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Kepemudaan (embed PublicKarangTarunaPage view) */}
      {activeTab === 'environment' && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <PublicKarangTarunaPage />
        </div>
      )}
    </div>
  );
};
