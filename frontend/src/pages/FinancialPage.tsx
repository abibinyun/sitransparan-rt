import React, { useState } from 'react';
import {
  useFinancialSummary,
  useDuesPayments,
  useFinancialTransactions,
  useVerifyDuesPayment,
} from '../services/financial';
import { DuesPaymentModal } from '../components/DuesPaymentModal';
import { TransactionModal } from '../components/TransactionModal';

export const FinancialPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dues' | 'transactions'>('dues');
  const [isDuesModalOpen, setIsDuesModalOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);

  const { data: summary, isLoading: isSummaryLoading } = useFinancialSummary();
  const { data: rawDues, isLoading: isDuesLoading } = useDuesPayments();
  const { data: rawTx, isLoading: isTxLoading } = useFinancialTransactions();

  const duesList = Array.isArray(rawDues) ? rawDues : (rawDues as any)?.data || [];
  const txList = Array.isArray(rawTx) ? rawTx : (rawTx as any)?.data || [];
  const verifyDues = useVerifyDuesPayment();

  const handleVerify = async (id: string, status: 'verified' | 'rejected') => {
    try {
      await verifyDues.mutateAsync({ id, status });
    } catch (err) {
      console.error('Failed to update verification status', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Transparansi Keuangan RT</h2>
          <p className="text-sm text-gray-500">Ringkasan kas RT, kelola iuran warga & transaksi kas</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setIsDuesModalOpen(true)}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            + Bayar / Catat Iuran
          </button>
          <button
            onClick={() => setIsTxModalOpen(true)}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
          >
            + Transaksi Kas RT
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Masuk (Income)</p>
          <p className="mt-2 text-2xl font-bold text-green-600">
            {isSummaryLoading ? '...' : `Rp ${(summary?.monthly_income || 0).toLocaleString('id-ID')}`}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Keluar (Expense)</p>
          <p className="mt-2 text-2xl font-bold text-red-600">
            {isSummaryLoading ? '...' : `Rp ${(summary?.monthly_expense || 0).toLocaleString('id-ID')}`}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Saldo Kas RT</p>
          <p className="mt-2 text-2xl font-bold text-indigo-600">
            {isSummaryLoading ? '...' : `Rp ${(summary?.current_balance || 0).toLocaleString('id-ID')}`}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('dues')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'dues'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Iuran Warga
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'transactions'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Transaksi Kas RT
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'dues' && (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
          {isDuesLoading ? (
            <div className="p-6 text-center text-gray-500">Memuat data iuran...</div>
          ) : duesList.length === 0 ? (
            <div className="p-6 text-center text-gray-500">Belum ada riwayat iuran warga</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Warga
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Kategori / Periode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Jumlah
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Bukti
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {duesList.map((item: any) => (
                  <tr key={item.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {item.resident_name || item.resident_id}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                      {item.fee_category_name || 'Iuran'} ({item.period_month}/{item.period_year})
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-gray-900">
                      Rp {item.amount.toLocaleString('id-ID')}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          item.status === 'verified'
                            ? 'bg-green-100 text-green-800'
                            : item.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {item.proof_url ? (
                        <a
                          href={item.proof_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 underline hover:text-indigo-900"
                        >
                          Lihat Bukti
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium space-x-2">
                      {item.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleVerify(item.id, 'verified')}
                            className="text-green-600 hover:text-green-900"
                          >
                            Verifikasi
                          </button>
                          <button
                            onClick={() => handleVerify(item.id, 'rejected')}
                            className="text-red-600 hover:text-red-900"
                          >
                            Tolak
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
          {isTxLoading ? (
            <div className="p-6 text-center text-gray-500">Memuat data transaksi...</div>
          ) : txList.length === 0 ? (
            <div className="p-6 text-center text-gray-500">Belum ada transaksi kas</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Tanggal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Tipe
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Kategori / Ket.
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Jumlah
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Bukti
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {txList.map((tx: any) => (
                  <tr key={tx.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                      {tx.transaction_date}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          tx.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {tx.type === 'income' ? 'Masuk' : 'Keluar'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      <div className="font-medium">{tx.category}</div>
                      {tx.description && (
                        <div className="text-xs text-gray-500">{tx.description}</div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-gray-900">
                      {tx.type === 'income' ? '+' : '-'} Rp {tx.amount.toLocaleString('id-ID')}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {tx.proof_url ? (
                        <a
                          href={tx.proof_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 underline hover:text-indigo-900"
                        >
                          Lihat Bukti
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modals */}
      <DuesPaymentModal isOpen={isDuesModalOpen} onClose={() => setIsDuesModalOpen(false)} />
      <TransactionModal isOpen={isTxModalOpen} onClose={() => setIsTxModalOpen(false)} />
    </div>
  );
};
