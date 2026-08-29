import React from 'react';
import { ArrowUpRight, ArrowDownRight, Layers, Landmark } from 'lucide-react';
import { usePublicFinancialSummary, formatRupiah } from '../services/public_transparency';

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
 * Widget kas publik dinamis: menampilkan ringkasan kas total dan seluruh
 * kantong kas / dana (funds) yang terdaftar di lingkungan RT secara dinamis.
 */
export const KasSummaryWidget: React.FC = () => {
  const { data: kas, isLoading } = usePublicFinancialSummary();

  if (isLoading) {
    return <div className="h-48 animate-pulse rounded-xl bg-slate-100" aria-label="Memuat ringkasan kas" />;
  }

  if (!kas) return null;

  const maxCategory = Math.max(...(kas.spending_breakdown || []).map((b) => b.amount), 1);
  const funds = kas.funds || [];

  return (
    <section aria-label="Ringkasan kas transparansi" className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700">
          <Landmark className="h-4 w-4 text-emerald-700" /> Kas &amp; Saldo Lingkungan
        </h2>
        <span className="text-xs text-slate-400">Transparan &amp; Terbuka</span>
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <p className="text-xs font-semibold text-slate-500">Total Saldo Kas Gabungan</p>
          <p className="mt-1 text-3xl sm:text-4xl font-black tracking-tight text-slate-900 tabular-nums">
            {formatRupiah(kas.current_balance)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm border-t border-slate-100 pt-3">
          <div className="bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-100">
            <p className="flex items-center gap-1 text-xs font-bold text-emerald-800">
              <ArrowUpRight className="h-3.5 w-3.5" /> Masuk
            </p>
            <p className="mt-1 font-extrabold text-slate-900 tabular-nums text-sm">{formatRupiah(kas.monthly_income)}</p>
            <p className="text-[10px] text-emerald-700">bulan ini</p>
          </div>
          <div className="bg-rose-50/60 p-2.5 rounded-lg border border-rose-100">
            <p className="flex items-center gap-1 text-xs font-bold text-rose-800">
              <ArrowDownRight className="h-3.5 w-3.5" /> Keluar
            </p>
            <p className="mt-1 font-extrabold text-slate-900 tabular-nums text-sm">{formatRupiah(kas.monthly_expense)}</p>
            <p className="text-[10px] text-rose-700">bulan ini</p>
          </div>
        </div>
      </div>

      {/* Rincian Seluruh Kantong Kas Dinamis (Funds) */}
      {funds.length > 0 && (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-600" /> Rincian Kantong Kas ({funds.length})
            </p>
          </div>
          <div className="space-y-2">
            {funds.map((fund) => {
              const badgeConfig = FUND_TYPE_BADGES[fund.type] || FUND_TYPE_BADGES.other;
              return (
                <div
                  key={fund.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/80 hover:bg-slate-100/80 transition-colors"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs font-bold text-slate-800 truncate">{fund.name}</p>
                      {fund.is_default && (
                        <span className="inline-block bg-emerald-100 text-emerald-800 border border-emerald-200 text-[9px] font-bold px-1.5 py-0.5 rounded">
                          Utama
                        </span>
                      )}
                    </div>
                    <span className={`inline-block mt-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded border ${badgeConfig.bg}`}>
                      {FUND_TYPE_LABELS[fund.type] || badgeConfig.text}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-extrabold text-slate-900 tabular-nums">
                      {formatRupiah(fund.balance)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {kas.spending_breakdown.length > 0 && (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Alokasi Pengeluaran</p>
          <ul className="space-y-2.5">
            {kas.spending_breakdown.slice(0, 4).map((b) => (
              <li key={b.category} className="text-xs">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-medium text-slate-600">
                    {b.category.split('_').join(' ')}
                  </span>
                  <span className="shrink-0 font-bold text-slate-800 tabular-nums">
                    {formatRupiah(b.amount)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-600"
                    style={{ width: `${Math.max((b.amount / maxCategory) * 100, 4)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};
