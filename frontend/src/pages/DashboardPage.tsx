import React from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Download,
  FileDown,
  PiggyBank,
  Sparkles,
  TrendingUp,
  Users,
  WalletCards,
} from 'lucide-react';
import { useDashboardMetrics } from '../services/dashboard';
import { useAuthStore } from '../store/useAuthStore';

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
  tone: 'indigo' | 'emerald' | 'rose' | 'sky';
}> = ({ title, value, description, icon: Icon, tone }) => {
  const tones = {
    indigo: 'from-indigo-500 to-violet-500 text-indigo-600 bg-indigo-50 ring-indigo-100',
    emerald: 'from-emerald-500 to-teal-500 text-emerald-600 bg-emerald-50 ring-emerald-100',
    rose: 'from-rose-500 to-orange-500 text-rose-600 bg-rose-50 ring-rose-100',
    sky: 'from-sky-500 to-blue-500 text-sky-600 bg-sky-50 ring-sky-100',
  }[tone];

  const [gradient, text, bg, ring] = tones.split(' ');
  const secondGradient = tones.split(' ')[1];

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-white/70 bg-white p-5 shadow-sm shadow-slate-200/70 ring-1 ring-slate-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-200/80">
      <div className={`absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br ${gradient} ${secondGradient} opacity-10 transition group-hover:scale-125`} />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{title}</p>
          <p className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{value}</p>
          <p className="mt-2 text-sm font-medium text-slate-500">{description}</p>
        </div>
        <div className={`rounded-2xl ${bg} p-3 ${text} ring-1 ${ring}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};

export const DashboardPage: React.FC = () => {
  const { user, activeTenant } = useAuthStore();
  const { data: metrics, isLoading } = useDashboardMetrics();

  const exportCSV = () => {
    if (!metrics) return;
    const headers = ['Metrik', 'Nilai'];
    const rows = [
      ['Total Warga', metrics.totalResidents.toString()],
      ['Pemasukan Kas', metrics.totalIncome.toString()],
      ['Pengeluaran Kas', metrics.totalExpense.toString()],
      ['Saldo Kas', metrics.balance.toString()],
      ['Iuran Pending', metrics.pendingDues.toString()],
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Kas_RT_${activeTenant?.code || 'RT'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-36 animate-pulse rounded-3xl bg-white/80 shadow-sm" />
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
    <div className="space-y-6 sm:space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-300/40 sm:p-8 print:bg-white print:text-slate-950 print:shadow-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(99,102,241,0.45),transparent_28rem),radial-gradient(circle_at_85%_30%,rgba(20,184,166,0.3),transparent_24rem)]" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-indigo-100 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              Dashboard RT
            </div>
            <h2 className="mt-5 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">
              Kelola warga, kas, dan kegiatan dengan tampilan yang lebih terarah.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Ringkasan operasional {activeTenant?.name || 'RT'} ({activeTenant?.code || '-'}) untuk membantu pengurus mengambil keputusan cepat dan transparan.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col print:hidden">
            <button
              onClick={exportCSV}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <button
              onClick={exportPDF}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <FileDown className="h-4 w-4" />
              Export PDF
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Warga" value={metrics?.totalResidents || 0} description="Warga terdata aktif" icon={Users} tone="indigo" />
        <StatCard title="Pemasukan" value={formatRupiah(income)} description="Akumulasi kas masuk" icon={ArrowUpRight} tone="emerald" />
        <StatCard title="Pengeluaran" value={formatRupiah(expense)} description="Akumulasi kas keluar" icon={ArrowDownRight} tone="rose" />
        <StatCard title="Saldo Kas" value={formatRupiah(balance)} description={`${metrics?.pendingDues || 0} iuran pending`} icon={WalletCards} tone="sky" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="rounded-[2rem] border border-white/70 bg-white p-5 shadow-sm shadow-slate-200/70 ring-1 ring-slate-100 sm:p-6">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Visual Kas</p>
              <h3 className="mt-1 text-xl font-black tracking-tight text-slate-950">Pemasukan vs Pengeluaran</h3>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
              <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Pemasukan</span>
              <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" />Pengeluaran</span>
            </div>
          </div>

          <div className="space-y-5">
            {metrics?.monthlyTrend.map((item, idx) => {
              const incPct = Math.round((item.income / maxAmount) * 100);
              const expPct = Math.round((item.expense / maxAmount) * 100);

              return (
                <div key={idx} className="group rounded-2xl border border-slate-100 p-3 transition hover:border-indigo-100 hover:bg-indigo-50/30">
                  <div className="mb-2 flex flex-col gap-1 text-xs font-bold text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm text-slate-900">{item.month}</span>
                    <span className="text-slate-500">Masuk {formatRupiah(item.income)} · Keluar {formatRupiah(item.expense)}</span>
                  </div>
                  <div className="grid gap-2">
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div style={{ width: `${incPct}%` }} className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-500" title={`Pemasukan: ${formatRupiah(item.income)}`} />
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div style={{ width: `${expPct}%` }} className="h-full rounded-full bg-gradient-to-r from-rose-400 to-orange-500 transition-all duration-500" title={`Pengeluaran: ${formatRupiah(item.expense)}`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-[2rem] border border-white/70 bg-white p-6 shadow-sm shadow-slate-200/70 ring-1 ring-slate-100">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600 ring-1 ring-indigo-100">
                <PiggyBank className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Kesehatan Kas</p>
                <h3 className="text-lg font-black text-slate-950">{healthRatio}% surplus</h3>
              </div>
            </div>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-teal-400 transition-all duration-700" style={{ width: `${Math.min(healthRatio, 100)}%` }} />
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-500">
              Selamat datang, <span className="font-bold text-slate-900">{user?.name}</span>. Anda masuk sebagai <span className="font-bold text-indigo-600">{user?.role}</span>.
            </p>
          </div>

          <div className="rounded-[2rem] bg-gradient-to-br from-indigo-600 to-slate-950 p-6 text-white shadow-xl shadow-indigo-200/60">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-indigo-100" />
              <h3 className="font-black">Insight cepat</h3>
            </div>
            <p className="mt-3 text-sm leading-6 text-indigo-100">
              Gunakan kartu ringkasan untuk memantau performa kas dan lihat tren bulanan untuk mendeteksi lonjakan pengeluaran lebih awal.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
};

export default DashboardPage;
