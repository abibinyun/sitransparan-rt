import React, { useState } from 'react';
import {
  useFinancialSummary,
  useDuesPayments,
  useFinancialTransactions,
  useVerifyDuesPayment,
  useFeeCategories,
  useCreateFeeCategory,
  useDeleteFeeCategory,
} from '../services/financial';
import { DuesPaymentModal } from '../components/DuesPaymentModal';
import { TransactionModal } from '../components/TransactionModal';
import { SimpleDialog } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select } from '../components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { FeePeriod } from '../types/financial';

export const FinancialPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dues' | 'transactions' | 'categories'>('dues');
  const [isDuesModalOpen, setIsDuesModalOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);

  // Fee category form state
  const [catName, setCatName] = useState('');
  const [catAmount, setCatAmount] = useState<number>(0);
  const [catPeriod, setCatPeriod] = useState<FeePeriod>('monthly');
  const [catDesc, setCatDesc] = useState('');

  const { data: summary, isLoading: isSummaryLoading } = useFinancialSummary();
  const { data: rawDues, isLoading: isDuesLoading } = useDuesPayments();
  const { data: rawTx, isLoading: isTxLoading } = useFinancialTransactions();
  const { data: rawCats, isLoading: isCatsLoading } = useFeeCategories();

  const duesList = Array.isArray(rawDues) ? rawDues : (rawDues as any)?.data || [];
  const txList = Array.isArray(rawTx) ? rawTx : (rawTx as any)?.data || [];
  const catList = Array.isArray(rawCats) ? rawCats : (rawCats as any)?.data || [];

  const verifyDues = useVerifyDuesPayment();
  const createFeeCat = useCreateFeeCategory();
  const deleteFeeCat = useDeleteFeeCategory();

  const handleVerify = async (id: string, status: 'verified' | 'rejected') => {
    try {
      await verifyDues.mutateAsync({ id, status });
    } catch (err) {
      console.error('Failed to update verification status', err);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName || catAmount <= 0) return;
    try {
      await createFeeCat.mutateAsync({
        name: catName,
        amount: catAmount,
        period: catPeriod,
        description: catDesc || undefined,
      });
      setIsCatModalOpen(false);
      setCatName('');
      setCatAmount(0);
      setCatPeriod('monthly');
      setCatDesc('');
    } catch (err) {
      console.error('Failed to create fee category', err);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm('Hapus kategori iuran ini?')) {
      try {
        await deleteFeeCat.mutateAsync(id);
      } catch (err) {
        console.error('Failed to delete fee category', err);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Transparansi Keuangan RT</h2>
          <p className="text-sm text-gray-500">Ringkasan kas RT, kelola iuran warga & transaksi kas</p>
        </div>
        <div className="flex flex-wrap gap-2">
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
          <button
            onClick={() => setIsCatModalOpen(true)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            + Master Jenis Iuran
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
          <button
            onClick={() => setActiveTab('categories')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'categories'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Master Kategori Iuran ({catList.length})
          </button>
        </nav>
      </div>

      {/* Tab Content: Dues */}
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

      {/* Tab Content: Transactions */}
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

      {/* Tab Content: Master Categories */}
      {activeTab === 'categories' && (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <div>
              <h3 className="font-semibold text-gray-900">Daftar Jenis / Tarif Iuran Warga</h3>
              <p className="text-xs text-gray-500">Master jenis iuran yang dapat dipilih saat mencatat pembayaran warga</p>
            </div>
            <Button size="sm" onClick={() => setIsCatModalOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Tambah Jenis Iuran
            </Button>
          </div>
          {isCatsLoading ? (
            <div className="p-6 text-center text-gray-500">Memuat master kategori iuran...</div>
          ) : catList.length === 0 ? (
            <div className="p-6 text-center text-gray-500">Belum ada jenis iuran. Silakan tambahkan baru.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Nama Iuran</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Tarif / Nominal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Periode</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Keterangan</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {catList.map((cat: any) => (
                  <tr key={cat.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-gray-900">{cat.name}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">Rp {Number(cat.amount).toLocaleString('id-ID')}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                      <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700">
                        {cat.period === 'monthly' ? 'Bulanan' : 'Sekali Bayar (Insidental)'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{cat.description || '-'}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Hapus Kategori"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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

      {/* Master Fee Category Modal */}
      <SimpleDialog
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        title="Tambah Jenis / Kategori Iuran"
      >
        <form onSubmit={handleCreateCategory} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="catName">Nama Iuran *</Label>
            <Input
              id="catName"
              type="text"
              placeholder="Contoh: Iuran Kebersihan, Iuran Keamanan, Jimpitan"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="catAmount">Nominal (Rp) *</Label>
              <Input
                id="catAmount"
                type="number"
                min="1"
                placeholder="50000"
                value={catAmount || ''}
                onChange={(e) => setCatAmount(Number(e.target.value))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="catPeriod">Periode Pembayaran *</Label>
              <Select
                id="catPeriod"
                value={catPeriod}
                onChange={(e) => setCatPeriod(e.target.value as FeePeriod)}
              >
                <option value="monthly">Bulanan</option>
                <option value="one_time">Sekali Bayar (Insidental)</option>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="catDesc">Keterangan / Pos Alokasi</Label>
            <Input
              id="catDesc"
              type="text"
              placeholder="Contoh: Digunakan untuk biaya angkut sampah mingguan"
              value={catDesc}
              onChange={(e) => setCatDesc(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsCatModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={createFeeCat.isPending}>
              {createFeeCat.isPending ? 'Menyimpan...' : 'Simpan Kategori'}
            </Button>
          </div>
        </form>
      </SimpleDialog>
    </div>
  );
};