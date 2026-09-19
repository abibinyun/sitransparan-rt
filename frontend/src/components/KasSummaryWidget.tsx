import React, { useState, useMemo } from 'react';
import {
  Layers,
  Landmark,
  PiggyBank,
  ChevronRight,
  Clock,
  Info,
  Search,
  ChevronLeft
} from 'lucide-react';
import {
  usePublicFinancialSummary,
  usePublicFeeCategories,
  usePublicTransactions,
  formatRupiah,
  PublicFundSummary,
  PublicFeeCategory
} from '../services/public_transparency';
import { Dialog } from './ui/dialog';
import { Select } from './ui/select';

const FUND_TYPE_LABELS: Record<string, string> = {
  operational: 'Operasional',
  social: 'Sosial / Duka',
  youth: 'Kepemudaan / Karang Taruna',
  infrastructure: 'Pembangunan / Sarpras',
  other: 'Lainnya',
};

const FUND_TYPE_BADGES: Record<string, { bg: string; text: string }> = {
  operational: { bg: 'bg-[#f4f8fb] text-[#0066cc] border-[#d2d2d7]', text: 'Operasional' },
  social: { bg: 'bg-amber-50 text-amber-800 border-amber-200', text: 'Sosial / Duka' },
  youth: { bg: 'bg-indigo-50 text-indigo-800 border-indigo-200', text: 'Karang Taruna' },
  infrastructure: { bg: 'bg-sky-50 text-sky-800 border-sky-200', text: 'Pembangunan' },
  other: { bg: 'bg-[#f5f5f7] text-[#707070] border-[#d2d2d7]', text: 'Lainnya' },
};

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Modal detail arus kas transparan untuk satu kantong kas atau satu pos iuran.
 * Dilengkapi dengan filter periode, tipe transaksi, pencarian, dan paginasi.
 */
interface KasDetailModalProps {
  selectedFund: PublicFundSummary | null;
  selectedCategory: PublicFeeCategory | null;
  onClose: () => void;
}

const KasDetailModal: React.FC<KasDetailModalProps> = ({ selectedFund, selectedCategory, onClose }) => {
  const isFund = Boolean(selectedFund);
  const title = isFund ? selectedFund?.name : selectedCategory?.name;
  const balance = isFund ? selectedFund?.balance || 0 : selectedCategory?.balance || 0;

  // Filter & Pagination state
  const [page, setPage] = useState<number>(1);
  const [typeFilter, setTypeFilter] = useState<'income' | 'expense' | ''>('');
  const [selectedMonth, setSelectedMonth] = useState<number | ''>('');
  const [selectedYear, setSelectedYear] = useState<number | ''>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const limit = 8;

  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => [currentYear, currentYear - 1, currentYear - 2], [currentYear]);

  const { data, isLoading } = usePublicTransactions({
    fund_id: selectedFund?.id,
    category: selectedCategory ? selectedCategory.name : undefined,
    type: typeFilter,
    month: selectedMonth,
    year: selectedYear,
    search: searchQuery,
    page,
    limit,
  });

  const transactions = data?.data || [];
  const totalItems = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  return (
    <Dialog
      isOpen={true}
      onClose={onClose}
      title={title || (isFund ? 'Kantong Kas RT' : 'Pos Iuran Warga')}
      description={`Saldo Bersih: ${formatRupiah(balance)}`}
      className="w-[96vw] sm:w-[92vw] max-w-2xl rounded-xl bg-white shadow-2xl border border-[#d2d2d7] p-0 text-[#1d1d1f]"
    >
      <div className="flex flex-col max-h-[82vh]">
        {/* Sub-badge Utama jika fund default */}
        {selectedFund?.is_default && (
          <div className="px-3.5 sm:px-4 pt-2.5">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#f4f8fb] text-[#0066cc] border border-[#d2d2d7]">
              Kantong Kas Utama
            </span>
          </div>
        )}

        {/* Modal Sub-Metrics if Category */}
        {selectedCategory && (
          <div className="grid grid-cols-2 gap-2 p-3 sm:p-3.5 bg-[#f4f8fb] border-b border-[#d2d2d7] text-xs">
            <div className="p-2.5 rounded-lg bg-white border border-[#d2d2d7]">
              <p className="text-[10px] font-medium text-[#707070]">Iuran Terkumpul</p>
              <p className="font-semibold text-[#0066cc] mt-0.5 tabular-nums">
                {formatRupiah(selectedCategory.collected)}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-[#d2d2d7]">
              <p className="text-[10px] font-medium text-[#707070]">Disalurkan / Terpakai</p>
              <p className="font-semibold text-rose-600 mt-0.5 tabular-nums">
                {formatRupiah(selectedCategory.spent)}
              </p>
            </div>
          </div>
        )}

        {/* Filter Bar: Pencarian, Tipe (Masuk/Keluar), Bulan, dan Tahun */}
        <div className="p-3 sm:p-3.5 border-b border-[#d2d2d7] bg-[#f5f5f7] space-y-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#858585] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari keterangan mutasi atau pos..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white rounded-lg border border-[#d2d2d7] text-[#1d1d1f] placeholder:text-[#858585] focus:outline-none focus:border-[#0071e3]"
            />
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            {/* Filter Arus */}
            <div>
              <Select
                value={typeFilter}
                onValueChange={(val) => {
                  setTypeFilter(val as any);
                  setPage(1);
                }}
              >
                <option value="">Semua Arus</option>
                <option value="income">Uang Masuk (+)</option>
                <option value="expense">Uang Keluar (-)</option>
              </Select>
            </div>

            {/* Filter Bulan */}
            <div>
              <Select
                value={selectedMonth !== '' ? String(selectedMonth) : ''}
                onValueChange={(val) => {
                  setSelectedMonth(val ? Number(val) : '');
                  setPage(1);
                }}
              >
                <option value="">Semua Bulan</option>
                {MONTH_NAMES.map((name, idx) => (
                  <option key={idx + 1} value={String(idx + 1)}>
                    {name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Filter Tahun */}
            <div>
              <Select
                value={selectedYear !== '' ? String(selectedYear) : ''}
                onValueChange={(val) => {
                  setSelectedYear(val ? Number(val) : '');
                  setPage(1);
                }}
              >
                <option value="">Semua Tahun</option>
                {yearOptions.map((yr) => (
                  <option key={yr} value={String(yr)}>
                    {yr}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="p-3 sm:p-4 space-y-2 flex-1 divide-y divide-[#d2d2d7] overflow-y-auto min-w-0">
          <div className="flex items-center justify-between pb-1 text-xs">
            <p className="font-semibold text-[#1d1d1f] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#0071e3]" /> Riwayat Mutasi Buku Kas
            </p>
            <span className="text-[11px] text-[#707070] tabular-nums">
              Total {totalItems} transaksi
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-2 pt-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 rounded-lg bg-[#f5f5f7] animate-pulse" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-10 text-center space-y-1 text-xs text-[#707070]">
              <Info className="w-5 h-5 mx-auto text-[#858585] mb-1 opacity-60" />
              <p className="font-medium">Tidak ada data mutasi yang cocok dengan filter.</p>
              <p className="text-[11px] text-[#858585]">Coba ubah kriteria pencarian, bulan, atau jenis arus.</p>
            </div>
          ) : (
            <div className="space-y-2 pt-2">
              {transactions.map((t) => {
                const isIncome = t.type === 'income';
                const dateStr = t.transaction_date
                  ? new Date(t.transaction_date).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '-';
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-[#d2d2d7] bg-white hover:bg-[#f5f5f7] transition-colors text-xs gap-2"
                  >
                    <div className="min-w-0 flex-1 pr-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            isIncome ? 'bg-[#0071e3]' : 'bg-rose-500'
                          }`}
                        />
                        <p className="font-semibold text-[#1d1d1f] truncate">
                          {t.description || t.category}
                        </p>
                      </div>
                      <p className="text-[10px] text-[#707070] mt-0.5 truncate">{dateStr} • {t.category}</p>
                    </div>
                    <div className="text-right shrink-0 whitespace-nowrap pl-1">
                      <p
                        className={`font-semibold tabular-nums text-xs sm:text-sm ${
                          isIncome ? 'text-[#0066cc]' : 'text-rose-600'
                        }`}
                      >
                        {isIncome ? '+' : '-'} {formatRupiah(t.amount)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Pagination & Footer */}
        <div className="p-3 border-t border-[#d2d2d7] bg-[#f5f5f7] flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0 text-xs">
          {/* Controls Paginasi */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#d2d2d7] bg-white text-[#1d1d1f] disabled:opacity-40 hover:bg-[#e2e2e5] transition-colors font-medium text-[11px]"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Sebelumnya
            </button>
            <span className="text-[11px] text-[#707070] tabular-nums">
              Halaman {page} dari {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#d2d2d7] bg-white text-[#1d1d1f] disabled:opacity-40 hover:bg-[#e2e2e5] transition-colors font-medium text-[11px]"
            >
              Selanjutnya <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between w-full sm:w-auto gap-3">
            <span className="text-[10px] text-[#707070] hidden sm:inline">
              Data kas dapat diaudit warga
            </span>
            <button
              onClick={onClose}
              className="apple-btn-secondary text-xs px-4 py-1.5 shrink-0 ml-auto"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

/**
 * Widget kas publik dinamis: menampilkan list kantong kas dan pos iuran warga
 * dengan rincian transaksi interaktif tanpa banner saldo redundant.
 */
export const KasSummaryWidget: React.FC = () => {
  const { data: kas, isLoading: isKasLoading } = usePublicFinancialSummary();
  const { data: feeCategories, isLoading: isCatLoading } = usePublicFeeCategories();

  const [activeTab, setActiveTab] = useState<'funds' | 'dues'>('funds');
  const [selectedFund, setSelectedFund] = useState<PublicFundSummary | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<PublicFeeCategory | null>(null);

  if (isKasLoading) {
    return <div className="h-48 animate-pulse rounded-lg bg-[#e2e2e5]" aria-label="Memuat ringkasan kas" />;
  }

  if (!kas) return null;

  const funds = kas.funds || [];
  const categories = feeCategories || [];

  return (
    <>
      <section aria-label="Ringkasan kas transparansi" className="apple-card p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xs sm:text-sm font-semibold uppercase tracking-wider text-[#1d1d1f]">
            <Landmark className="h-4 w-4 text-[#0071e3]" /> Kas &amp; Saldo Lingkungan
          </h2>
          <span className="text-[10px] text-[#707070] font-medium">Klik untuk rincian</span>
        </div>

        {/* Sub-Tabs: Kantong Kas vs Pos Iuran Warga */}
        <div>
          <div className="flex items-center gap-1.5 mb-3 p-1 rounded-lg bg-[#f5f5f7] border border-[#d2d2d7]">
            <button
              type="button"
              onClick={() => setActiveTab('funds')}
              className={`flex-1 py-1.5 px-3 rounded-md transition-all flex items-center justify-center gap-1.5 text-xs font-medium ${
                activeTab === 'funds'
                  ? 'bg-white text-[#1d1d1f] shadow-2xs'
                  : 'text-[#707070] hover:text-[#1d1d1f]'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-[#0071e3]" /> Kantong Kas ({funds.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('dues')}
              className={`flex-1 py-1.5 px-3 rounded-md transition-all flex items-center justify-center gap-1.5 text-xs font-medium ${
                activeTab === 'dues'
                  ? 'bg-white text-[#1d1d1f] shadow-2xs'
                  : 'text-[#707070] hover:text-[#1d1d1f]'
              }`}
            >
              <PiggyBank className="w-3.5 h-3.5 text-[#0071e3]" /> Pos Iuran ({categories.length})
            </button>
          </div>

          {/* List Kantong Kas (Funds) */}
          {activeTab === 'funds' && (
            <div className="space-y-2">
              {funds.length === 0 ? (
                <p className="text-xs text-[#707070] py-3 text-center">Belum ada kantong kas tercatat.</p>
              ) : (
                funds.map((fund) => {
                  const badgeConfig = FUND_TYPE_BADGES[fund.type] || FUND_TYPE_BADGES.other;
                  return (
                    <button
                      key={fund.id}
                      type="button"
                      onClick={() => {
                        setSelectedFund(fund);
                        setSelectedCategory(null);
                      }}
                      className="w-full text-left flex items-center justify-between p-3 rounded-lg border border-[#d2d2d7] bg-white hover:bg-[#f5f5f7] transition-all group"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs sm:text-sm font-semibold text-[#1d1d1f] truncate group-hover:text-[#0071e3] transition-colors">
                            {fund.name}
                          </p>
                          {fund.is_default && (
                            <span className="bg-[#f4f8fb] text-[#0066cc] border border-[#d2d2d7] text-[9px] font-semibold px-1.5 py-0.5 rounded-full">
                              Utama
                            </span>
                          )}
                        </div>
                        <span className={`inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${badgeConfig.bg}`}>
                          {FUND_TYPE_LABELS[fund.type] || badgeConfig.text}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <p className="text-xs sm:text-sm font-semibold text-[#1d1d1f] tabular-nums">
                          {formatRupiah(fund.balance)}
                        </p>
                        <ChevronRight className="w-4 h-4 text-[#858585] group-hover:text-[#1d1d1f] transition-colors" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* List Pos Iuran Warga (Fee Categories) */}
          {activeTab === 'dues' && (
            <div className="space-y-2">
              {isCatLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-12 rounded-lg bg-[#f5f5f7] animate-pulse" />
                  ))}
                </div>
              ) : categories.length === 0 ? (
                <p className="text-xs text-[#707070] py-3 text-center">Belum ada pos iuran terdaftar.</p>
              ) : (
                categories.map((cat) => {
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat);
                        setSelectedFund(null);
                      }}
                      className="w-full text-left flex items-center justify-between p-3 rounded-lg border border-[#d2d2d7] bg-white hover:bg-[#f5f5f7] transition-all group"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs sm:text-sm font-semibold text-[#1d1d1f] truncate group-hover:text-[#0071e3] transition-colors">
                          {cat.name}
                        </p>
                        <p className="text-[11px] text-[#707070] mt-0.5">
                          Tarif: {formatRupiah(cat.amount)} · {cat.period === 'monthly' ? 'Bulanan' : 'Sekali'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-2 justify-end">
                          <p className="text-xs sm:text-sm font-semibold text-[#0066cc] tabular-nums">
                            {formatRupiah(cat.balance)}
                          </p>
                          <ChevronRight className="w-4 h-4 text-[#858585] group-hover:text-[#1d1d1f] transition-colors" />
                        </div>
                        <p className="text-[10px] text-[#707070] mt-0.5">
                          Terkumpul: {formatRupiah(cat.collected)}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </section>

      {/* Rincian Arus Kas Modal */}
      {(selectedFund || selectedCategory) && (
        <KasDetailModal
          selectedFund={selectedFund}
          selectedCategory={selectedCategory}
          onClose={() => {
            setSelectedFund(null);
            setSelectedCategory(null);
          }}
        />
      )}
    </>
  );
};
