import React, { useState } from 'react';
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
  Calculator,
  PiggyBank
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
        <div className="max-w-6xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold px-3 py-1 rounded-full">
            <Recycle className="w-3.5 h-3.5 text-emerald-400" /> Gerakan Ekonomi Sirkular &amp; Lingkungan
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Bank Sampah Warga &amp; Pemuda
          </h1>
          <p className="max-w-2xl text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
            Setorkan sampah anorganik rumah tangga Anda. Dapatkan saldo tabungan keluarga secara transparan dan dukung kemandirian kas pemuda Karang Taruna.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
        {/* Live KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="civic-card p-4 sm:p-5 flex flex-col justify-between">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl w-fit mb-2">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold">Total Terkumpul</p>
              <p className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums mt-0.5">
                {(summary?.total_weight_kg || 0).toLocaleString('id-ID')}{' '}
                <span className="text-xs font-normal text-slate-400">kg</span>
              </p>
            </div>
          </div>

          <div className="civic-card p-4 sm:p-5 flex flex-col justify-between">
            <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl w-fit mb-2">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold">Keluarga Terlibat</p>
              <p className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums mt-0.5">
                {summary?.active_households_count || 0}{' '}
                <span className="text-xs font-normal text-slate-400">KK</span>
              </p>
            </div>
          </div>

          <div className="civic-card p-4 sm:p-5 flex flex-col justify-between">
            <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl w-fit mb-2">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold">Tabungan Warga</p>
              <p className="text-lg sm:text-xl font-black text-amber-700 tabular-nums mt-0.5">
                {formatRupiah(summary?.total_resident_earnings || 0)}
              </p>
            </div>
          </div>

          <div className="civic-card p-4 sm:p-5 flex flex-col justify-between">
            <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl w-fit mb-2">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold">Kas Pemuda RT</p>
              <p className="text-lg sm:text-xl font-black text-indigo-700 tabular-nums mt-0.5">
                {formatRupiah(summary?.total_karang_taruna_share || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Kalkulator Simulasi Tabungan Sampah (Interactive Tool Anti AI-Slop) */}
        <section className="civic-card p-5 sm:p-7 border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white space-y-5">
          <div className="flex items-center gap-2.5 border-b border-emerald-100 pb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Simulasi Nilai Setoran Sampah Anda</h2>
              <p className="text-xs text-slate-500">Hitung estimasi rupiah yang masuk ke tabungan KK dan kas pemuda</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Pilih Jenis Sampah Terpilah
                </label>
                <select
                  value={selectedCategory?.id || ''}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-xs sm:text-sm font-semibold p-2.5 rounded-xl outline-none"
                >
                  {(categories || []).map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} — Rp {cat.price_per_unit.toLocaleString('id-ID')}/{cat.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Perkiraan Berat / Satuan ({selectedCategory?.unit || 'kg'})
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={inputWeight}
                    onChange={(e) => setInputWeight(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-sm font-bold p-2.5 rounded-xl outline-none"
                  />
                  <span className="text-xs font-bold text-slate-500 uppercase px-2">
                    {selectedCategory?.unit || 'kg'}
                  </span>
                </div>
              </div>
            </div>

            {/* Hasil Estimasi Real-Time */}
            <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-3 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Estimasi Nilai Total
                </span>
                <p className="text-2xl font-black text-slate-900 tabular-nums mt-0.5">
                  {formatRupiah(estimatedTotal)}
                </p>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-emerald-800 flex items-center gap-1.5">
                    <PiggyBank className="w-4 h-4 text-emerald-600" /> Tabungan Masuk KK ({selectedCategory?.resident_share_pct || 0}%):
                  </span>
                  <span className="font-extrabold text-slate-900 tabular-nums">
                    {formatRupiah(residentShare)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-indigo-800 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" /> Kas Karang Taruna ({selectedCategory?.karang_taruna_share_pct || 0}%):
                  </span>
                  <span className="font-extrabold text-slate-900 tabular-nums">
                    {formatRupiah(youthShare)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Master Data Kategori & Harga Transparan */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Coins className="w-5 h-5 text-emerald-700" /> Daftar Harga &amp; Rasio Bagi Hasil
            </h2>
            <span className="text-xs font-semibold text-slate-500">
              {categories?.length || 0} kategori aktif
            </span>
          </div>

          {isCategoriesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : !categories || categories.length === 0 ? (
            <div className="civic-card p-10 text-center space-y-2">
              <Info className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="font-bold text-sm text-slate-700">Belum Ada Kategori Sampah</p>
              <p className="text-xs text-slate-500">Pengurus RT belum menambahkan master data harga sampah.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {categories.map((cat) => (
                <div key={cat.id} className="civic-card p-4 space-y-2 flex flex-col justify-between">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">{cat.name}</h3>
                    <p className="text-lg font-black text-emerald-700 tabular-nums mt-1">
                      Rp {cat.price_per_unit.toLocaleString('id-ID')}{' '}
                      <span className="text-xs font-normal text-slate-500">/{cat.unit}</span>
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
                    <span className="text-emerald-700">Warga: {cat.resident_share_pct}%</span>
                    <span className="text-indigo-700">Pemuda: {cat.karang_taruna_share_pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 3 Langkah Mudah Menyetor */}
        <section className="civic-card p-6 space-y-4">
          <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
            <Info className="w-5 h-5 text-emerald-700" /> Alur Penimbangan Sampah Warga
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center">1</span>
              <p className="font-bold text-slate-900">Pilah dari Rumah</p>
              <p className="text-slate-500 leading-relaxed">
                Pisahkan kardus, botol plastik, kertas, atau minyak jelantah dalam kondisi bersih &amp; kering.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center">2</span>
              <p className="font-bold text-slate-900">Bawa ke Posko Penimbangan</p>
              <p className="text-slate-500 leading-relaxed">
                Bawa sampah terpilah saat jadwal penimbangan berkala Karang Taruna di balai RT.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center">3</span>
              <p className="font-bold text-slate-900">Saldo Masuk Buku Tabungan</p>
              <p className="text-slate-500 leading-relaxed">
                Petugas pemuda menimbang &amp; mencatat. Saldo keluarga langsung terakumulasi dalam sistem.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PublicWasteBankPage;
