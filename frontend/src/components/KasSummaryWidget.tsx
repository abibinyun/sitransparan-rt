import React from 'react';
import { Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { usePublicFinancialSummary, formatRupiah } from '../services/public_transparency';

/**
 * Widget kas publik: angka agregat saja (sesuai endpoint publik).
 * Bukan deretan kartu statistik — satu blok buku-kas dengan hierarki:
 * saldo besar di kiri, arus bulan berjalan di kanan, alokasi sebagai bar.
 */
export const KasSummaryWidget: React.FC = () => {
  const { data: kas, isLoading } = usePublicFinancialSummary();

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-xl bg-slate-100" aria-label="Memuat ringkasan kas" />;
  }

  if (!kas) return null;

  const maxCategory = Math.max(...kas.spending_breakdown.map((b) => b.amount), 1);

  return (
    <section aria-label="Ringkasan kas RT" className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
          <Wallet className="h-4 w-4 text-emerald-700" /> Kas RT
        </h2>
        <span className="text-xs text-slate-400">Transparan &amp; dapat diaudit</span>
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <p className="text-xs font-semibold text-slate-500">Saldo saat ini</p>
          <p className="mt-1 text-4xl font-extrabold tracking-tight text-slate-900 tabular-nums">
            {formatRupiah(kas.current_balance)}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm border-t border-slate-100 pt-3">
          <div>
            <p className="flex items-center gap-1 font-semibold text-emerald-700">
              <ArrowUpRight className="h-4 w-4" /> Masuk
            </p>
            <p className="mt-0.5 font-bold text-slate-800 tabular-nums">{formatRupiah(kas.monthly_income)}</p>
            <p className="text-[11px] text-slate-400">bulan ini</p>
          </div>
          <div>
            <p className="flex items-center gap-1 font-semibold text-rose-700">
              <ArrowDownRight className="h-4 w-4" /> Keluar
            </p>
            <p className="mt-0.5 font-bold text-slate-800 tabular-nums">{formatRupiah(kas.monthly_expense)}</p>
            <p className="text-[11px] text-slate-400">bulan ini</p>
          </div>
        </div>
      </div>

      {kas.spending_breakdown.length > 0 && (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold text-slate-500">Alokasi pengeluaran</p>
          <ul className="mt-2 space-y-3">
            {kas.spending_breakdown.slice(0, 4).map((b) => (
              <li key={b.category} className="text-xs">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-semibold text-slate-600">
                    {b.category.split('_').join(' ')}
                  </span>
                  <span className="shrink-0 font-semibold text-slate-700 tabular-nums">
                    {formatRupiah(b.amount)}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
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
