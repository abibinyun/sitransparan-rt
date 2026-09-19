import React from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Download,
  FileDown,
  PiggyBank,
  TrendingUp,
  Users,
  WalletCards,
} from 'lucide-react';
import { useDashboardMetrics, exportFinancialReport } from '../services/dashboard';
import { useAuthStore } from '../store/useAuthStore';
import { ResidentDashboardView } from './ResidentDashboardView';

const formatRupiah = (val: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val);

const StatCard: React.FC<{
  title: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  tone: 'blue' | 'emerald' | 'rose' | 'slate';
}> = ({ title, value, description, icon: Icon, tone }) => {
  const iconColors = {
    blue: 'text-[#0071e3] bg-[#f4f8fb] border-[#d2d2d7]',
    emerald: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    rose: 'text-rose-700 bg-rose-50 border-rose-200',
    slate: 'text-[#1d1d1f] bg-[#f5f5f7] border-[#d2d2d7]',
  }[tone];

  return (
    <div className="apple-card p-4 sm:p-5 flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#707070]">{title}</p>
        <p className="mt-2 text-xl sm:text-2xl font-semibold tracking-tight text-[#1d1d1f] tabular-nums truncate">{value}</p>
        <p className="mt-1 text-xs text-[#707070]">{description}</p>
      </div>
      <div className={`rounded-lg border p-2.5 shrink-0 ${iconColors}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
};

export const DashboardPage: React.FC = () => {
  const { user, activeTenant } = useAuthStore();
  const isResident =
    user?.role === 'RESIDENT' ||
    String(user?.role).toLowerCase() === 'resident';

  const { data: metrics, isLoading } = useDashboardMetrics();

  const [exporting, setExporting] = React.useState<'csv' | 'pdf' | null>(null);
  const [exportError, setExportError] = React.useState('');

  if (isResident) {
    return <ResidentDashboardView />;
  }

  const exportCSV = async () => {
    setExportError('');
    setExporting('csv');
    try {
      await exportFinancialReport('csv');
    } catch (e: any) {
      setExportError(e?.response?.data?.error || e?.message || 'Gagal export CSV');
    } finally {
      setExporting(null);
    }
  };

  const exportPDF = async () => {
    setExportError('');
    setExporting('pdf');
    try {
      await exportFinancialReport('pdf');
    } catch (e: any) {
      setExportError(e?.response?.data?.error || e?.message || 'Gagal export PDF');
    } finally {
      setExporting(null);
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-lg bg-[#e2e2e5]" />
        ))}
      </div>
    );
  }

  const maxAmount = metrics
    ? Math.max(...metrics.monthlyTrend.map((m) => Math.max(m.income, m.expense)), 1)
    : 1;

  const balance = metrics?.balance || 0;
  const income = metrics?.totalIncome || 0;
  const expense = metrics?.totalExpense || 0;
  const healthRatio = income > 0 ? Math.max(0, Math.round(((income - expense) / income) * 100)) : 0;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Banner Ringkasan Eksekutif */}
      <section className="apple-card p-5 sm:p-7 border-[#d2d2d7] bg-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <h2 className="text-xl sm:text-3xl font-semibold tracking-tight text-[#1d1d1f] leading-snug">
              Tata Kelola RT/RW yang Transparan, Akuntabel, dan Mandiri.
            </h2>
            <p className="text-xs sm:text-sm text-[#707070] leading-relaxed">
              Ringkasan operasional {activeTenant?.name || 'RT'} ({activeTenant?.code || '-'}) untuk membantu pengurus mengambil keputusan cepat dan terbuka bagi seluruh warga.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 print:hidden">
            <button
              onClick={exportCSV}
              disabled={!!exporting}
              className="apple-btn-secondary text-xs px-4 py-2 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5 text-[#0066cc]" />
              {exporting === 'csv' ? 'Mengunduh...' : 'Export CSV'}
            </button>
            <button
              onClick={exportPDF}
              disabled={!!exporting}
              className="apple-btn-primary text-xs px-4 py-2 flex items-center gap-1.5 disabled:opacity-50"
            >
              <FileDown className="h-3.5 w-3.5 text-white" />
              {exporting === 'pdf' ? 'Mengunduh...' : 'Export PDF'}
            </button>
          </div>
        </div>
        {exportError && <p className="mt-2 text-xs font-semibold text-rose-600">{exportError}</p>}
      </section>

      {/* Grid 4 Kartu Metrik Utama */}
      <section className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Warga" value={metrics?.totalResidents || 0} description="Warga terdata aktif" icon={Users} tone="slate" />
        <StatCard title="Pemasukan" value={formatRupiah(income)} description="Akumulasi kas masuk" icon={ArrowUpRight} tone="emerald" />
        <StatCard title="Pengeluaran" value={formatRupiah(expense)} description="Akumulasi kas keluar" icon={ArrowDownRight} tone="rose" />
        <StatCard title="Saldo Kas" value={formatRupiah(balance)} description={`${metrics?.pendingDues || 0} iuran pending`} icon={WalletCards} tone="blue" />
      </section>

      {/* Visual Arus Kas & Analisis Kesehatan */}
      <section className="grid gap-5 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="apple-card p-5 sm:p-6 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-[#d2d2d7]">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#707070]">Grafik Transparansi</p>
              <h3 className="mt-0.5 text-base sm:text-lg font-semibold text-[#1d1d1f]">Pemasukan vs Pengeluaran</h3>
            </div>
            <div className="flex items-center gap-3 text-xs text-[#707070]">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#0071e3]" />Pemasukan</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-500" />Pengeluaran</span>
            </div>
          </div>

          <div className="space-y-3">
            {metrics?.monthlyTrend && metrics.monthlyTrend.length > 0 ? (
              metrics.monthlyTrend.map((item, idx) => {
                const incPct = Math.round((item.income / maxAmount) * 100);
                const expPct = Math.round((item.expense / maxAmount) * 100);

                return (
                  <div key={idx} className="p-3 rounded-lg border border-[#d2d2d7] bg-[#f5f5f7] space-y-2">
                    <div className="flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:justify-between">
                      <span className="font-semibold text-[#1d1d1f]">{item.month}</span>
                      <span className="text-[11px] text-[#707070]">Masuk {formatRupiah(item.income)} · Keluar {formatRupiah(item.expense)}</span>
                    </div>
                    <div className="grid gap-1.5">
                      <div className="h-2 overflow-hidden rounded-full bg-[#e2e2e5]">
                        <div style={{ width: `${incPct}%` }} className="h-full rounded-full bg-[#0071e3] transition-all duration-300" title={`Pemasukan: ${formatRupiah(item.income)}`} />
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#e2e2e5]">
                        <div style={{ width: `${expPct}%` }} className="h-full rounded-full bg-rose-500 transition-all duration-300" title={`Pengeluaran: ${formatRupiah(item.expense)}`} />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center text-xs text-[#707070]">
                <PiggyBank className="h-8 w-8 text-[#858585] mb-2 opacity-60" />
                <p className="font-medium text-[#1d1d1f]">Belum ada transaksi kas untuk ditampilkan.</p>
                <p className="text-[11px] text-[#858585] mt-0.5">Transaksi yang dicatat akan muncul dalam grafik perbandingan bulanan.</p>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-5">
          {/* Rasio Kesehatan Kas */}
          <div className="apple-card p-5 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-[#f4f8fb] border border-[#d2d2d7] p-2 text-[#0066cc]">
                <PiggyBank className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#707070]">Kesehatan Kas</p>
                <h3 className="text-base font-semibold text-[#1d1d1f]">{healthRatio}% surplus</h3>
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#e2e2e5]">
              <div className="h-full rounded-full bg-[#0071e3] transition-all duration-500" style={{ width: `${Math.min(healthRatio, 100)}%` }} />
            </div>
            <p className="text-xs text-[#707070] leading-relaxed pt-1">
              Selamat datang, <span className="font-semibold text-[#1d1d1f]">{user?.name}</span>. Anda masuk sebagai <span className="font-semibold text-[#0066cc]">{user?.role}</span>.
            </p>
          </div>

          {/* Kartu Ringkasan Cepat */}
          <div className="apple-card p-5 space-y-2 bg-[#f4f8fb]">
            <div className="flex items-center gap-2 text-[#0066cc]">
              <TrendingUp className="h-4 w-4" />
              <h3 className="text-xs font-semibold uppercase tracking-wider">Pemantauan Mandiri</h3>
            </div>
            <p className="text-xs text-[#474747] leading-relaxed">
              Gunakan grafik perbandingan untuk memantau performa kas dan deteksi lonjakan pengeluaran sedini mungkin untuk menjaga keterbukaan warga.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
};

export default DashboardPage;
