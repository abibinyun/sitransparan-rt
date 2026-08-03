import React from 'react';
import { useDashboardMetrics } from '../services/dashboard';
import { useAuthStore } from '../store/useAuthStore';

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

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (isLoading) {
    return <div className="p-6 text-gray-500">Memuat dashboard...</div>;
  }

  const maxAmount = metrics
    ? Math.max(
        ...metrics.monthlyTrend.map((m) => Math.max(m.income, m.expense)),
        1
      )
    : 1;

  return (
    <div className="space-y-6">
      {/* Header & Export Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard & Reports</h2>
          <p className="text-sm text-gray-600">
            Ringkasan RT {activeTenant?.name || ''} ({activeTenant?.code || '-'})
          </p>
        </div>
        <div className="flex items-center space-x-3 print:hidden">
          <button
            onClick={exportCSV}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none"
          >
            Export CSV
          </button>
          <button
            onClick={exportPDF}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none"
          >
            Export PDF (Cetak)
          </button>
        </div>
      </div>

      {/* Welcome Card */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800">
          Selamat Datang, {user?.name}!
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Anda login sebagai <span className="font-semibold text-indigo-600">{user?.role}</span>.
        </p>
      </div>

      {/* Widget Ringkasan */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Total Warga
          </p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {metrics?.totalResidents || 0}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Total Pemasukan
          </p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">
            {formatRupiah(metrics?.totalIncome || 0)}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Total Pengeluaran
          </p>
          <p className="mt-2 text-3xl font-bold text-rose-600">
            {formatRupiah(metrics?.totalExpense || 0)}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Saldo Kas RT
          </p>
          <p className="mt-2 text-3xl font-bold text-blue-600">
            {formatRupiah(metrics?.balance || 0)}
          </p>
        </div>
      </div>

      {/* Chart Recharts / Visual Kas */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Grafik Arus Kas (Pemasukan vs Pengeluaran)</h3>
          <div className="flex items-center space-x-4 text-xs font-medium">
            <span className="flex items-center">
              <span className="inline-block w-3 h-3 bg-emerald-500 rounded-sm mr-1.5"></span>
              Pemasukan
            </span>
            <span className="flex items-center">
              <span className="inline-block w-3 h-3 bg-rose-500 rounded-sm mr-1.5"></span>
              Pengeluaran
            </span>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          {metrics?.monthlyTrend.map((item, idx) => {
            const incPct = Math.round((item.income / maxAmount) * 100);
            const expPct = Math.round((item.expense / maxAmount) * 100);

            return (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-gray-700">
                  <span>{item.month}</span>
                  <span>
                    Masuk: {formatRupiah(item.income)} | Keluar: {formatRupiah(item.expense)}
                  </span>
                </div>
                <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${incPct}%` }}
                    className="bg-emerald-500 h-full transition-all duration-300"
                    title={`Pemasukan: ${formatRupiah(item.income)}`}
                  />
                  <div
                    style={{ width: `${expPct}%` }}
                    className="bg-rose-500 h-full transition-all duration-300"
                    title={`Pengeluaran: ${formatRupiah(item.expense)}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
