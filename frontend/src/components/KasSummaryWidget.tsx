import React, { useState } from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Landmark,
  PiggyBank,
  ChevronRight,
  X,
  Clock,
  Info
} from 'lucide-react';
import {
  usePublicFinancialSummary,
  usePublicFeeCategories,
  usePublicTransactions,
  formatRupiah,
  PublicFundSummary,
  PublicFeeCategory
} from '../services/public_transparency';

const FUND_TYPE_LABELS: Record<string, string> = {
  operational: 'Operasional',
  social: 'Sosial / Duka',
  youth: 'Kepemudaan / Karang Taruna',
  infrastructure: 'Pembangunan / Sarpras',
  other: 'Lainnya',
};

const FUND_TYPE_BADGES: Record<string, { bg: string; text: string }> = {
  operational: { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', text: 'Operasional' },
  social: { bg: 'bg-amber-50 text-amber-800 border-amber-200', text: 'Sosial / Duka' },
  youth: { bg: 'bg-indigo-50 text-indigo-800 border-indigo-200', text: 'Karang Taruna' },
  infrastructure: { bg: 'bg-sky-50 text-sky-800 border-sky-200', text: 'Pembangunan' },
  other: { bg: 'bg-slate-100 text-slate-700 border-slate-200', text: 'Lainnya' },
};

/**
 * Modal detail arus kas transparan untuk satu kantong kas atau satu pos iuran.
 * Menampilkan ringkasan saldo serta riwayat mutasi masuk dan keluar.
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

  const { data: transactions, isLoading } = usePublicTransactions({
    fund_id: selectedFund?.id,
    category: selectedCategory ? selectedCategory.name : undefined,
    limit: 50,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col max-h-[85vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border bg-slate-100 text-slate-700 border-slate-200">
                {isFund ? 'Kantong Kas RT' : 'Pos Iuran Warga'}
              </span>
              {selectedFund?.is_default && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Utama
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">{title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Saldo Bersih Tersedia:{' '}
              <span className="font-extrabold text-slate-900 tabular-nums">{formatRupiah(balance)}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Tutup rincian"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Sub-Metrics if Category */}
        {selectedCategory && (
          <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 border-b border-slate-100 text-xs">
            <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
              <p className="text-[10px] font-semibold text-slate-500">Iuran Terkumpul</p>
              <p className="font-black text-emerald-700 mt-0.5 tabular-nums">
                {formatRupiah(selectedCategory.collected)}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
              <p className="text-[10px] font-semibold text-slate-500">Disalurkan / Terpakai</p>
              <p className="font-black text-rose-700 mt-0.5 tabular-nums">
                {formatRupiah(selectedCategory.spent)}
              </p>
            </div>
          </div>
        )}

        {/* Transactions List */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1 divide-y divide-slate-100">
          <div className="flex items-center justify-between pb-2">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" /> Riwayat Mutasi Buku Kas
            </p>
            <span className="text-[10px] text-slate-400">Terbuka untuk warga</span>
          </div>

          {isLoading ? (
            <div className="space-y-2 pt-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : !transactions || transactions.length === 0 ? (
            <div className="py-10 text-center space-y-1 text-xs text-slate-400">
              <Info className="w-5 h-5 mx-auto text-slate-300 mb-1" />
              <p className="font-medium">Belum ada mutasi buku kas tercatat untuk pos ini.</p>
              <p className="text-[11px] text-slate-400">Mutasi akan otomatis tampil setelah pengurus membukukan kas.</p>
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
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors text-xs"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isIncome ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        <p className="font-bold text-slate-900 truncate">
                          {t.description || t.category}
                        </p>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">{dateStr} • {t.category}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className={`font-black tabular-nums ${
                          isIncome ? 'text-emerald-700' : 'text-rose-700'
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

        {/* Modal Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 text-center">
          <p className="text-[11px] text-slate-400">
            Transparansi publik RT/RW • Seluruh warga berhak memverifikasi buku kas lingkungan.
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Widget kas publik dinamis: menampilkan ringkasan kas total,
 * kantong kas (funds), dan pos iuran warga dengan rincian transaksi interaktif.
 */
export const KasSummaryWidget: React.FC = () => {
  const { data: kas, isLoading: isKasLoading } = usePublicFinancialSummary();
  const { data: feeCategories, isLoading: isCatLoading } = usePublicFeeCategories();

  const [activeTab, setActiveTab] = useState<'funds' | 'dues'>('funds');
  const [selectedFund, setSelectedFund] = useState<PublicFundSummary | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<PublicFeeCategory | null>(null);

  if (isKasLoading) {
    return <div className="h-48 animate-pulse rounded-2xl bg-slate-100" aria-label="Memuat ringkasan kas" />;
  }

  if (!kas) return null;

  const funds = kas.funds || [];
  const categories = feeCategories || [];

  return (
    <>
      <section aria-label="Ringkasan kas transparansi" className="civic-card p-5 sm:p-6 space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="flex items-center gap-2 text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-800">
            <Landmark className="h-4 w-4 text-emerald-600" /> Kas &amp; Saldo Lingkungan
          </h2>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
            Terbuka
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-500">Total Saldo Gabungan</p>
            <p className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-slate-900 tabular-nums">
              {formatRupiah(kas.current_balance)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs border-t border-slate-100 pt-3">
            <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-100">
              <p className="flex items-center gap-1 text-[11px] font-bold text-emerald-800">
                <ArrowUpRight className="h-3.5 w-3.5" /> Masuk Bulan Ini
              </p>
              <p className="mt-1 font-black text-slate-900 tabular-nums text-xs sm:text-sm">{formatRupiah(kas.monthly_income)}</p>
            </div>
            <div className="bg-rose-50/70 p-3 rounded-xl border border-rose-100">
              <p className="flex items-center gap-1 text-[11px] font-bold text-rose-800">
                <ArrowDownRight className="h-3.5 w-3.5" /> Keluar Bulan Ini
              </p>
              <p className="mt-1 font-black text-slate-900 tabular-nums text-xs sm:text-sm">{formatRupiah(kas.monthly_expense)}</p>
            </div>
          </div>
        </div>

        {/* Sub-Tabs: Kantong Kas vs Pos Iuran Warga */}
        <div className="border-t border-slate-100 pt-3">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('funds')}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 text-[11px] ${
                  activeTab === 'funds'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3 h-3 text-emerald-600" /> Kantong ({funds.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('dues')}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 text-[11px] ${
                  activeTab === 'dues'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <PiggyBank className="w-3 h-3 text-emerald-600" /> Pos Iuran ({categories.length})
              </button>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Klik untuk rincian</span>
          </div>

          {/* List Kantong Kas (Funds) */}
          {activeTab === 'funds' && (
            <div className="space-y-1.5">
              {funds.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">Belum ada kantong kas tercatat.</p>
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
                      className="w-full text-left flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100/80 hover:border-slate-200 transition-all group"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-bold text-slate-800 truncate group-hover:text-emerald-700 transition-colors">
                            {fund.name}
                          </p>
                          {fund.is_default && (
                            <span className="inline-block bg-emerald-100 text-emerald-800 border border-emerald-200 text-[9px] font-bold px-1.5 py-0.5 rounded">
                              Utama
                            </span>
                          )}
                        </div>
                        <span className={`inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded border ${badgeConfig.bg}`}>
                          {FUND_TYPE_LABELS[fund.type] || badgeConfig.text}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <p className="text-xs font-extrabold text-slate-900 tabular-nums">
                          {formatRupiah(fund.balance)}
                        </p>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 transition-colors" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* List Pos Iuran Warga (Fee Categories) */}
          {activeTab === 'dues' && (
            <div className="space-y-1.5">
              {isCatLoading ? (
                <div className="space-y-1.5">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-11 rounded-xl bg-slate-100 animate-pulse" />
                  ))}
                </div>
              ) : categories.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">Belum ada pos iuran terdaftar.</p>
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
                      className="w-full text-left flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100/80 hover:border-slate-200 transition-all group"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-bold text-slate-800 truncate group-hover:text-emerald-700 transition-colors">
                          {cat.name}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Tarif: {formatRupiah(cat.amount)} • {cat.period === 'monthly' ? 'Bulanan' : 'Sekali'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="text-right">
                          <p className="text-xs font-extrabold text-slate-900 tabular-nums">
                            {formatRupiah(cat.balance)}
                          </p>
                          <p className="text-[9px] text-emerald-700 font-semibold">
                            Terkumpul {formatRupiah(cat.collected)}
                          </p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 transition-colors" />
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
