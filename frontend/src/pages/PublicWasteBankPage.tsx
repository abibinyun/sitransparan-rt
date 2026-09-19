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
import { Select } from '../components/ui/select';

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
    <div className="pb-16 space-y-8 bg-[#f5f5f7] text-[#1d1d1f] min-h-screen">
      {/* Hero Section Apple */}
      <section className="bg-white text-[#1d1d1f] px-4 sm:px-6 py-12 sm:py-16 border-b border-[#d2d2d7]">
        <div className="max-w-6xl mx-auto space-y-3">
          <div className="apple-badge">
            <Recycle className="w-3.5 h-3.5 text-[#0071e3]" /> Gerakan Ekonomi Sirkular &amp; Lingkungan
          </div>
          <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight leading-tight text-[#1d1d1f]">
            Bank Sampah Warga &amp; Pemuda
          </h1>
          <p className="max-w-2xl text-xs sm:text-sm text-[#707070] leading-relaxed font-normal">
            Setorkan sampah anorganik rumah tangga Anda. Dapatkan saldo tabungan keluarga secara transparan dan dukung kemandirian kas pemuda Karang Taruna.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
        {/* Live KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="apple-card p-4 sm:p-5 flex flex-col justify-between">
            <div className="p-2 bg-[#f4f8fb] text-[#0066cc] rounded-lg w-fit mb-2 border border-[#d2d2d7]">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-[#707070] font-normal">Total Terkumpul</p>
              <p className="text-xl sm:text-2xl font-semibold text-[#1d1d1f] tabular-nums mt-0.5">
                {(summary?.total_weight_kg || 0).toLocaleString('id-ID')}{' '}
                <span className="text-xs font-normal text-[#707070]">kg</span>
              </p>
            </div>
          </div>

          <div className="apple-card p-4 sm:p-5 flex flex-col justify-between">
            <div className="p-2 bg-[#f4f8fb] text-[#0066cc] rounded-lg w-fit mb-2 border border-[#d2d2d7]">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-[#707070] font-normal">Keluarga Terlibat</p>
              <p className="text-xl sm:text-2xl font-semibold text-[#1d1d1f] tabular-nums mt-0.5">
                {summary?.active_households_count || 0}{' '}
                <span className="text-xs font-normal text-[#707070]">KK</span>
              </p>
            </div>
          </div>

          <div className="apple-card p-4 sm:p-5 flex flex-col justify-between">
            <div className="p-2 bg-[#f4f8fb] text-[#0066cc] rounded-lg w-fit mb-2 border border-[#d2d2d7]">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-[#707070] font-normal">Tabungan Warga</p>
              <p className="text-lg sm:text-xl font-semibold text-[#0066cc] tabular-nums mt-0.5">
                {formatRupiah(summary?.total_resident_earnings || 0)}
              </p>
            </div>
          </div>

          <div className="apple-card p-4 sm:p-5 flex flex-col justify-between">
            <div className="p-2 bg-[#f4f8fb] text-[#0066cc] rounded-lg w-fit mb-2 border border-[#d2d2d7]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-[#707070] font-normal">Kas Pemuda RT</p>
              <p className="text-lg sm:text-xl font-semibold text-[#1d1d1f] tabular-nums mt-0.5">
                {formatRupiah(summary?.total_karang_taruna_share || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Kalkulator Simulasi Tabungan Sampah */}
        <section className="apple-card p-5 sm:p-7 space-y-5">
          <div className="flex items-center gap-2.5 border-b border-[#d2d2d7] pb-3">
            <div className="w-8 h-8 rounded-lg bg-[#f4f8fb] flex items-center justify-center text-[#0066cc] border border-[#d2d2d7]">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#1d1d1f]">Simulasi Nilai Setoran Sampah Anda</h2>
              <p className="text-xs text-[#707070]">Hitung estimasi rupiah yang masuk ke tabungan KK dan kas pemuda</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1.5">
                  Pilih Jenis Sampah Terpilah
                </label>
                <Select
                  value={selectedCategory?.id || ''}
                  onValueChange={(val) => setSelectedCategoryId(val)}
                >
                  {(categories || []).map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} - Rp {cat.price_per_unit.toLocaleString('id-ID')}/{cat.unit}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1.5">
                  Perkiraan Berat / Satuan ({selectedCategory?.unit || 'kg'})
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={inputWeight}
                    onChange={(e) => setInputWeight(e.target.value)}
                    className="w-full bg-[#f5f5f7] border border-[#d2d2d7] text-sm font-semibold p-2.5 rounded-lg outline-none focus:border-[#0071e3] focus:bg-white"
                  />
                  <span className="text-xs font-semibold text-[#707070] uppercase px-2">
                    {selectedCategory?.unit || 'kg'}
                  </span>
                </div>
              </div>
            </div>

            {/* Hasil Estimasi Real-Time */}
            <div className="rounded-lg bg-[#f4f8fb] border border-[#d2d2d7] p-5 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-[#707070]">
                  Estimasi Nilai Total
                </span>
                <p className="text-2xl font-semibold text-[#1d1d1f] tabular-nums mt-0.5">
                  {formatRupiah(estimatedTotal)}
                </p>
              </div>

              <div className="space-y-2 pt-3 border-t border-[#d2d2d7] text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[#0066cc] flex items-center gap-1.5">
                    <PiggyBank className="w-4 h-4 text-[#0071e3]" /> Tabungan Masuk KK ({selectedCategory?.resident_share_pct || 0}%):
                  </span>
                  <span className="font-semibold text-[#0066cc] tabular-nums">
                    {formatRupiah(residentShare)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[#1d1d1f] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#707070]" /> Kas Karang Taruna ({selectedCategory?.karang_taruna_share_pct || 0}%):
                  </span>
                  <span className="font-semibold text-[#1d1d1f] tabular-nums">
                    {formatRupiah(youthShare)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Master Data Kategori & Harga Transparan */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#d2d2d7] pb-3">
            <h2 className="text-base sm:text-lg font-semibold text-[#1d1d1f] flex items-center gap-2">
              <Coins className="w-4 h-4 text-[#0071e3]" /> Daftar Harga &amp; Rasio Bagi Hasil
            </h2>
            <span className="text-xs font-normal text-[#707070]">
              {categories?.length || 0} kategori aktif
            </span>
          </div>

          {isCategoriesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-lg bg-[#e2e2e5] animate-pulse" />
              ))}
            </div>
          ) : !categories || categories.length === 0 ? (
            <div className="apple-card p-10 text-center space-y-2">
              <Info className="w-8 h-8 text-[#858585] mx-auto" />
              <p className="font-semibold text-sm text-[#1d1d1f]">Belum Ada Kategori Sampah</p>
              <p className="text-xs text-[#707070]">Pengurus RT belum menambahkan master data harga sampah.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {categories.map((cat) => (
                <div key={cat.id} className="apple-card p-4 space-y-2 flex flex-col justify-between">
                  <div>
                    <h3 className="font-semibold text-sm text-[#1d1d1f]">{cat.name}</h3>
                    <p className="text-lg font-semibold text-[#0066cc] tabular-nums mt-1">
                      Rp {cat.price_per_unit.toLocaleString('id-ID')}{' '}
                      <span className="text-xs font-normal text-[#707070]">/{cat.unit}</span>
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#d2d2d7] flex items-center justify-between text-[11px] text-[#707070]">
                    <span className="text-[#0066cc] font-medium">Warga: {cat.resident_share_pct}%</span>
                    <span>Pemuda: {cat.karang_taruna_share_pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 3 Langkah Mudah Menyetor */}
        <section className="apple-card p-6 space-y-4">
          <h3 className="font-semibold text-[#1d1d1f] text-base flex items-center gap-2">
            <Info className="w-4 h-4 text-[#0071e3]" /> Alur Penimbangan Sampah Warga
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-lg bg-[#f5f5f7] border border-[#d2d2d7] space-y-1.5">
              <span className="w-6 h-6 rounded-full bg-white text-[#0066cc] border border-[#d2d2d7] font-semibold flex items-center justify-center">1</span>
              <p className="font-semibold text-[#1d1d1f]">Pilah dari Rumah</p>
              <p className="text-[#474747] leading-relaxed">
                Pisahkan kardus, botol plastik, kertas, atau minyak jelantah dalam kondisi bersih &amp; kering.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-[#f5f5f7] border border-[#d2d2d7] space-y-1.5">
              <span className="w-6 h-6 rounded-full bg-white text-[#0066cc] border border-[#d2d2d7] font-semibold flex items-center justify-center">2</span>
              <p className="font-semibold text-[#1d1d1f]">Bawa ke Posko Penimbangan</p>
              <p className="text-[#474747] leading-relaxed">
                Bawa sampah terpilah saat jadwal penimbangan berkala Karang Taruna di balai RT.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-[#f5f5f7] border border-[#d2d2d7] space-y-1.5">
              <span className="w-6 h-6 rounded-full bg-white text-[#0066cc] border border-[#d2d2d7] font-semibold flex items-center justify-center">3</span>
              <p className="font-semibold text-[#1d1d1f]">Saldo Masuk Buku Tabungan</p>
              <p className="text-[#474747] leading-relaxed">
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
