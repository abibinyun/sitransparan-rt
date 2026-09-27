import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useMyHouseQuery } from '../services/house';
import {
  useFinancialSummary,
  useDuesPayments,
  useFinancialTransactions,
  useVerifyDuesPayment,
  useFeeCategories,
  useCreateFeeCategory,
  useDeleteFeeCategory,
  useFunds,
  useCreateFund,
  useUpdateFund,
  useDeleteFund,
  useUpdateFeeCategory,
  useResetFinancialData,
} from '../services/financial';
import { useUsers } from '../services/user';
import { useResidents } from '../services/resident';
import { DuesPaymentModal } from '../components/DuesPaymentModal';
import { DuesDisbursementModal } from '../components/DuesDisbursementModal';
import { TransactionModal } from '../components/TransactionModal';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Wallet, Coins, Plus, ArrowDownRight, ArrowUpRight, RotateCcw } from 'lucide-react';
import { FeeCategory, Fund } from '../types/financial';

// Modular Financial Components
import { DuesTab } from '../components/financial/DuesTab';
import { TransactionsTab } from '../components/financial/TransactionsTab';
import { MasterFundsTab } from '../components/financial/MasterFundsTab';
import { CashCategoryModal, CashCategory } from '../components/financial/CashCategoryModal';
import { FeeCategoryModal } from '../components/financial/FeeCategoryModal';
import { FundModal } from '../components/financial/FundModal';
import { ResidentDuesHistoryModal } from '../components/financial/ResidentDuesHistoryModal';

export const FinancialPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'transactions' | 'dues' | 'master'>('transactions');
  const [isDuesModalOpen, setIsDuesModalOpen] = useState(false);
  const [isDisburseModalOpen, setIsDisburseModalOpen] = useState(false);
  const [selectedDisburseCatId, setSelectedDisburseCatId] = useState('');
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);

  // Modal states
  const [isCashCatModalOpen, setIsCashCatModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FeeCategory | null>(null);
  const [isFundModalOpen, setIsFundModalOpen] = useState(false);
  const [editingFund, setEditingFund] = useState<Fund | null>(null);
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(null);

  // Custom cash categories
  const initialCashCategories: CashCategory[] = [
    { id: 'cat_in_1', name: 'IURAN_WARGA', type: 'income', desc: 'Akumulasi iuran rutin bulanan warga' },
    { id: 'cat_in_2', name: 'DONASI', type: 'income', desc: 'Donasi & sumbangan sukarela' },
    { id: 'cat_in_3', name: 'DANA_DESA', type: 'income', desc: 'Bantuan dana pemerintah/desa' },
    { id: 'cat_in_4', name: 'LAINNYA_PEMASUKAN', type: 'income', desc: 'Pemasukan insidental lain' },
    { id: 'cat_out_1', name: 'OPERASIONAL_RT', type: 'expense', desc: 'Operasional rutin & keamanan' },
    { id: 'cat_out_2', name: 'KEBERSIHAN', type: 'expense', desc: 'Pengangkutan sampah & kebersihan' },
    { id: 'cat_out_3', name: 'KEGIATAN_WARGA', type: 'expense', desc: 'Acara warga, rapat & perlombaan' },
    { id: 'cat_out_4', name: 'PERBAIKAN_FASILITAS', type: 'expense', desc: 'Perbaikan jalan, pos satpam & lampu' },
    { id: 'cat_out_5', name: 'LAINNYA_PENGELUARAN', type: 'expense', desc: 'Pengeluaran insidental lain' },
  ];

  const [cashCats, setCashCats] = useState<CashCategory[]>(() => {
    try {
      const saved = localStorage.getItem('sitransparan_custom_cash_categories');
      return saved ? JSON.parse(saved) : initialCashCategories;
    } catch {
      return initialCashCategories;
    }
  });

  // Filter & Pagination for Dues
  const [duesViewMode, setDuesViewMode] = useState<'resident' | 'history' | 'disbursements'>('resident');
  const [duesCategoryFilter, setDuesCategoryFilter] = useState<string>('all');
  const [duesStatusFilter, setDuesStatusFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [duesSearch, setDuesSearch] = useState('');
  const [duesPage, setDuesPage] = useState(1);
  const duesLimit = 10;

  // Filter & Pagination for Transactions
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [txFundFilter, setTxFundFilter] = useState<string>('all');
  const [txSearch, setTxSearch] = useState('');
  const [txPage, setTxPage] = useState(1);
  const txLimit = 10;

  // Queries
  const { data: summary, isLoading: isSummaryLoading } = useFinancialSummary();
  const { data: rawDues, isLoading: isDuesLoading } = useDuesPayments();
  const { data: rawTx, isLoading: isTxLoading } = useFinancialTransactions();
  const { data: rawCats, isLoading: isCatsLoading } = useFeeCategories();
  const { data: rawFunds, isLoading: isFundsLoading } = useFunds();
  const { data: rawResidents, isLoading: isResidentsLoading } = useResidents({ limit: 100 });
  const { data: rawUsers } = useUsers(100, 0);

  const { user } = useAuthStore();
  const { data: houseData } = useMyHouseQuery();
  const isResident = String(user?.role || '').toLowerCase() === 'resident';
  const head = houseData?.head_resident;

  // Dues filtering for residents
  const rawDuesList: any[] = Array.isArray(rawDues) ? rawDues : (rawDues as any)?.data || [];
  const duesList: any[] = React.useMemo(() => {
    if (!isResident) return rawDuesList;
    const validResidentIds = [head?.id, (user as any)?.resident_id].filter(Boolean);
    const validNames = [user?.name?.trim().toLowerCase(), head?.full_name?.trim().toLowerCase()].filter(Boolean);
    if (validResidentIds.length === 0 && validNames.length === 0) return [];
    return rawDuesList.filter((d: any) => {
      if (d.resident_id && validResidentIds.includes(d.resident_id)) return true;
      if (d.resident_name) {
        const dName = d.resident_name.trim().toLowerCase();
        return validNames.some((n) => n && (dName === n || dName.includes(n)));
      }
      return false;
    });
  }, [rawDuesList, isResident, user, head]);

  const txList: any[] = Array.isArray(rawTx) ? rawTx : (rawTx as any)?.data || [];
  const catList: FeeCategory[] = Array.isArray(rawCats) ? rawCats : (rawCats as any)?.data || [];
  const fundList: Fund[] = Array.isArray(rawFunds) ? rawFunds : (rawFunds as any)?.data || [];
  const residentList: any[] = Array.isArray(rawResidents) ? rawResidents : (rawResidents as any)?.data || [];
  const userList: any[] = Array.isArray(rawUsers) ? rawUsers : (rawUsers as any)?.data || [];

  // Mutations
  const verifyDues = useVerifyDuesPayment();
  const createFeeCat = useCreateFeeCategory();
  const updateFeeCat = useUpdateFeeCategory();
  const deleteFeeCat = useDeleteFeeCategory();
  const createFund = useCreateFund();
  const updateFund = useUpdateFund();
  const deleteFund = useDeleteFund();
  const resetFinancialData = useResetFinancialData();

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Saldo per pos iuran
  const duesCategoryBalances = React.useMemo(() => {
    const balances: Record<string, { collected: number; spent: number; balance: number; verifiedCount: number; pendingCount: number }> = {};
    catList.forEach((c) => {
      balances[c.id] = { collected: 0, spent: 0, balance: 0, verifiedCount: 0, pendingCount: 0 };
    });

    duesList.forEach((d) => {
      if (!balances[d.fee_category_id]) {
        balances[d.fee_category_id] = { collected: 0, spent: 0, balance: 0, verifiedCount: 0, pendingCount: 0 };
      }
      if (d.status === 'verified') {
        balances[d.fee_category_id].collected += Number(d.amount);
        balances[d.fee_category_id].verifiedCount += 1;
      } else if (d.status === 'pending') {
        balances[d.fee_category_id].pendingCount += 1;
      }
    });

    txList.forEach((tx) => {
      if (tx.disbursed_from_category_id && balances[tx.disbursed_from_category_id]) {
        balances[tx.disbursed_from_category_id].spent += Number(tx.amount);
      }
    });

    Object.keys(balances).forEach((k) => {
      balances[k].balance = balances[k].collected - balances[k].spent;
    });

    return balances;
  }, [catList, duesList, txList]);

  // Rekap per warga
  const residentDuesSummary = React.useMemo(() => {
    const summaryMap: Record<string, { resident_id: string; resident_name: string; total_paid: number; verified_count: number; pending_count: number; categories: Record<string, { category_name: string; total: number; count: number }>; items: any[] }> = {};

    residentList.forEach((r) => {
      summaryMap[r.id] = {
        resident_id: r.id,
        resident_name: r.full_name || 'Warga Tanpa Nama',
        total_paid: 0,
        verified_count: 0,
        pending_count: 0,
        categories: {},
        items: [],
      };
    });

    duesList.forEach((d) => {
      const rId = d.resident_id || 'unregistered';
      if (!summaryMap[rId]) {
        summaryMap[rId] = {
          resident_id: rId,
          resident_name: d.resident_name || 'Warga Terdata di Iuran',
          total_paid: 0,
          verified_count: 0,
          pending_count: 0,
          categories: {},
          items: [],
        };
      }

      summaryMap[rId].items.push(d);

      if (d.status === 'verified') {
        summaryMap[rId].total_paid += Number(d.amount);
        summaryMap[rId].verified_count += 1;

        const catName = d.fee_category_name || 'Iuran';
        if (!summaryMap[rId].categories[catName]) {
          summaryMap[rId].categories[catName] = { category_name: catName, total: 0, count: 0 };
        }
        summaryMap[rId].categories[catName].total += Number(d.amount);
        summaryMap[rId].categories[catName].count += 1;
      } else if (d.status === 'pending') {
        summaryMap[rId].pending_count += 1;
      }
    });

    let result = Object.values(summaryMap);
    if (isResident) {
      const validResidentIds = [head?.id, (user as any)?.resident_id].filter(Boolean);
      const validNames = [user?.name?.trim().toLowerCase(), head?.full_name?.trim().toLowerCase()].filter(Boolean);
      result = result.filter(
        (r) =>
          validResidentIds.includes(r.resident_id) ||
          validNames.some((n) => n && (r.resident_name.trim().toLowerCase() === n || r.resident_name.trim().toLowerCase().includes(n)))
      );
    }

    if (duesCategoryFilter !== 'all') {
      result = result.filter((r) => r.items.some((item: any) => item.fee_category_id === duesCategoryFilter));
    }

    if (duesSearch.trim()) {
      const query = duesSearch.trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.resident_name.toLowerCase().includes(query) ||
          r.items.some((item: any) => (item.fee_category_name || '').toLowerCase().includes(query))
      );
    }

    return result.sort((a, b) => b.total_paid - a.total_paid);
  }, [residentList, duesList, isResident, user, head, duesCategoryFilter, duesSearch]);

  // Filter dues list
  const filteredDues = React.useMemo(() => {
    return duesList.filter((d) => {
      if (duesStatusFilter !== 'all' && d.status !== duesStatusFilter) return false;
      if (duesCategoryFilter !== 'all' && d.fee_category_id !== duesCategoryFilter) return false;
      if (duesSearch.trim()) {
        const query = duesSearch.trim().toLowerCase();
        const matchName = (d.resident_name || '').toLowerCase().includes(query);
        const matchCat = (d.fee_category_name || '').toLowerCase().includes(query);
        if (!matchName && !matchCat) return false;
      }
      return true;
    });
  }, [duesList, duesStatusFilter, duesCategoryFilter, duesSearch]);

  const totalDuesPages = Math.ceil(filteredDues.length / duesLimit) || 1;
  const paginatedDues = React.useMemo(() => {
    const start = (duesPage - 1) * duesLimit;
    return filteredDues.slice(start, start + duesLimit);
  }, [filteredDues, duesPage, duesLimit]);

  const duesDisbursementList = React.useMemo(() => {
    return txList.filter((tx) => Boolean(tx.disbursed_from_category_id));
  }, [txList]);

  // Filter transactions
  const filteredTx = React.useMemo(() => {
    return txList.filter((t) => {
      if (txTypeFilter !== 'all' && t.type !== txTypeFilter) return false;
      if (txFundFilter !== 'all' && t.fund_id !== txFundFilter) return false;
      if (txSearch.trim()) {
        const q = txSearch.trim().toLowerCase();
        const matchDesc = (t.description || '').toLowerCase().includes(q);
        const matchCat = (t.category || '').toLowerCase().includes(q);
        if (!matchDesc && !matchCat) return false;
      }
      return true;
    });
  }, [txList, txTypeFilter, txFundFilter, txSearch]);

  const txTotalPages = Math.ceil(filteredTx.length / txLimit) || 1;
  const paginatedTx = React.useMemo(() => {
    const start = (txPage - 1) * txLimit;
    return filteredTx.slice(start, start + txLimit);
  }, [filteredTx, txPage, txLimit]);

  // Handlers
  const handleVerify = async (id: string, status: 'verified' | 'rejected') => {
    try {
      await verifyDues.mutateAsync({ id, status });
      showFeedback('success', `Pembayaran iuran berhasil ${status === 'verified' ? 'disetujui' : 'ditolak'}.`);
    } catch (err: any) {
      showFeedback('error', err?.response?.data?.error || 'Gagal memperbarui status iuran.');
    }
  };

  const handleSaveFeeCategory = async (payload: any) => {
    try {
      if (payload.id) {
        await updateFeeCat.mutateAsync(payload);
        showFeedback('success', 'Kategori iuran berhasil diperbarui.');
      } else {
        await createFeeCat.mutateAsync(payload);
        showFeedback('success', 'Kategori iuran baru berhasil ditambahkan.');
      }
      setIsCatModalOpen(false);
      setEditingCategory(null);
    } catch (err: any) {
      showFeedback('error', err?.response?.data?.error || 'Gagal menyimpan kategori iuran.');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm('Hapus kategori iuran ini?')) {
      try {
        await deleteFeeCat.mutateAsync(id);
        showFeedback('success', 'Kategori iuran berhasil dihapus.');
      } catch (err: any) {
        showFeedback('error', err?.response?.data?.error || 'Gagal menghapus kategori iuran.');
      }
    }
  };

  const handleSaveFund = async (payload: any) => {
    try {
      if (payload.id) {
        await updateFund.mutateAsync(payload);
        showFeedback('success', 'Kantong kas berhasil diperbarui.');
      } else {
        await createFund.mutateAsync(payload);
        showFeedback('success', 'Kantong kas berhasil ditambahkan.');
      }
      setIsFundModalOpen(false);
      setEditingFund(null);
    } catch (err: any) {
      showFeedback('error', err?.response?.data?.error || 'Gagal menyimpan kantong kas.');
    }
  };

  const handleDeleteFund = async (id: string, isDefault: boolean) => {
    if (isDefault) {
      alert('Kantong Kas Utama tidak dapat dihapus.');
      return;
    }
    if (confirm('Hapus kantong kas ini?')) {
      try {
        await deleteFund.mutateAsync(id);
        showFeedback('success', 'Kantong kas berhasil dihapus.');
      } catch (err: any) {
        showFeedback('error', err?.response?.data?.error || 'Gagal menghapus kantong kas.');
      }
    }
  };

  const handleSaveCashCategories = (cats: CashCategory[]) => {
    setCashCats(cats);
    try {
      localStorage.setItem('sitransparan_custom_cash_categories', JSON.stringify(cats));
    } catch {}
  };

  return (
    <div className="space-y-6">
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl text-xs sm:text-sm font-bold border ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-950 border-emerald-200'
              : 'bg-rose-50 text-rose-950 border-rose-200'
          }`}
        >
          {feedbackMsg.text}
        </div>
      )}

      {/* Header & Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-[#d2d2d7]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#f4f8fb] text-[#0066cc] border border-[#d2d2d7] mb-1.5">
            <Wallet className="h-3.5 w-3.5 text-[#0071e3]" />
            Pembukuan &amp; Kas Warga
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">Transparansi Keuangan RT</h1>
          <p className="text-sm text-[#707070]">Tata kelola iuran warga dan arus kas operasional berbasis kantong dana (multi-fund).</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isResident && (
            <>
              <Button
                onClick={() => setIsDuesModalOpen(true)}
                aria-label="Catat Iuran Warga"
                className="h-9 gap-1.5 font-medium text-xs apple-btn-primary"
              >
                <Coins className="h-3.5 w-3.5" />
                Catat Iuran Warga
              </Button>
              <Button
                onClick={() => setIsTxModalOpen(true)}
                variant="outline"
                className="h-9 gap-1.5 font-medium text-xs text-[#0066cc] border-[#d2d2d7] hover:bg-[#f4f8fb]"
              >
                <Plus className="h-3.5 w-3.5" />
                Transaksi Kas RT
              </Button>
            </>
          )}

          {(() => {
            if (isResident || typeof window === 'undefined') return false;
            const h = window.location.hostname.toLowerCase();
            // Sembunyikan hanya di production murni (iscube.web.id atau subdomain prod tanpa tanda staging/dev)
            const isProd =
              h === 'iscube.web.id' ||
              (/^[a-z0-9-]+\.iscube\.web\.id$/.test(h) &&
                !h.includes('-staging') &&
                !h.includes('-dev') &&
                !h.startsWith('staging.'));
            return !isProd;
          })() ? (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (window.confirm('Apakah Anda yakin ingin mengosongkan seluruh data iuran dan transaksi kas untuk testing? Tindakan ini tidak dapat dibatalkan.')) {
                  try {
                    await resetFinancialData.mutateAsync();
                    showFeedback('success', 'Data keuangan berhasil di-reset untuk testing.');
                  } catch (err: any) {
                    showFeedback('error', err?.response?.data?.error || 'Gagal reset data keuangan.');
                  }
                }
              }}
              disabled={resetFinancialData.isPending}
              className="h-9 px-3 text-xs text-rose-600 border-[#d2d2d7] hover:bg-rose-50 hover:border-rose-200"
              title="Reset data keuangan untuk pengujian (Aktif di Dev & Staging)"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-[#d2d2d7] shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#707070]">Total Saldo Kas</span>
            <div className="rounded-lg bg-[#f4f8fb] border border-[#d2d2d7] p-2 text-[#0066cc]">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-[#1d1d1f] tabular-nums">
              {isSummaryLoading ? '...' : `Rp ${(summary?.current_balance || 0).toLocaleString('id-ID')}`}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-[#707070]">Total likuiditas seluruh kantong dana aktif</p>
        </Card>

        <Card className="p-4 border-[#d2d2d7] shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#707070]">Arus Masuk (Income)</span>
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-emerald-600">
              <ArrowDownRight className="h-4 w-4 rotate-180" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-emerald-600 tabular-nums">
              {isSummaryLoading ? '...' : `Rp ${(summary?.monthly_income || 0).toLocaleString('id-ID')}`}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-[#707070]">Akumulasi iuran terverifikasi &amp; pemasukan kas</p>
        </Card>

        <Card className="p-4 border-[#d2d2d7] shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#707070]">Arus Keluar (Expense)</span>
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-2 text-rose-600">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-[#1d1d1f] tabular-nums">
              {isSummaryLoading ? '...' : `Rp ${(summary?.monthly_expense || 0).toLocaleString('id-ID')}`}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-[#707070]">Pengeluaran operasional &amp; belanja pos kegiatan</p>
        </Card>
      </div>

      {/* Tabs Navigasi 3 Pilar Utama */}
      <div className="border-b border-[#d2d2d7] -mx-4 px-4 sm:mx-0 sm:px-0">
        <nav className="-mb-px flex space-x-6 sm:space-x-8 overflow-x-auto scrollbar-none touch-pan-x">
          {!isResident && (
            <button
              id="tab-transactions"
              onClick={() => setActiveTab('transactions')}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors ${
                activeTab === 'transactions'
                  ? 'border-[#0071e3] text-[#0066cc] font-semibold'
                  : 'border-transparent text-[#707070] hover:text-[#1d1d1f]'
              }`}
            >
              1. Buku Kas RT ({txList.length})
            </button>
          )}
          <button
            id="tab-dues"
            onClick={() => setActiveTab('dues')}
            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors ${
              activeTab === 'dues'
                ? 'border-[#0071e3] text-[#0066cc] font-semibold'
                : 'border-transparent text-[#707070] hover:text-[#1d1d1f]'
            }`}
          >
            {isResident ? 'Iuran Keluarga Saya' : `2. Iuran Warga (${duesList.length})`}
          </button>
          {!isResident && (
            <button
              id="tab-master"
              onClick={() => setActiveTab('master')}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors relative ${
                activeTab === 'master'
                  ? 'border-[#0071e3] text-[#0066cc] font-semibold'
                  : 'border-transparent text-[#707070] hover:text-[#1d1d1f]'
              }`}
            >
              <span id="tab-categories" className="sr-only" onClick={(e) => { e.stopPropagation(); setActiveTab('master'); }} />
              <span id="tab-funds" className="sr-only" onClick={(e) => { e.stopPropagation(); setActiveTab('master'); }} />
              3. Pengaturan Pos &amp; Kantong Kas ({fundList.length + catList.length})
            </button>
          )}
        </nav>
      </div>

      {/* Tab 1: Transactions */}
      {activeTab === 'transactions' && (
        <TransactionsTab
          fundList={fundList}
          filteredTx={paginatedTx}
          txTotal={filteredTx.length}
          txPage={txPage}
          txLimit={txLimit}
          txTotalPages={txTotalPages}
          txTypeFilter={txTypeFilter}
          txFundFilter={txFundFilter}
          txSearch={txSearch}
          isTxLoading={isTxLoading}
          onTypeFilterChange={(type) => {
            setTxTypeFilter(type);
            setTxPage(1);
          }}
          onFundFilterChange={(fundId) => {
            setTxFundFilter(fundId);
            setTxPage(1);
          }}
          onSearchChange={(search) => {
            setTxSearch(search);
            setTxPage(1);
          }}
          onPageChange={setTxPage}
        />
      )}

      {/* Tab 2: Dues */}
      {activeTab === 'dues' && (
        <DuesTab
          catList={catList}
          duesCategoryBalances={duesCategoryBalances}
          duesCategoryFilter={duesCategoryFilter}
          duesViewMode={duesViewMode}
          duesStatusFilter={duesStatusFilter}
          duesSearch={duesSearch}
          isResident={isResident}
          isDuesLoading={isDuesLoading}
          isResidentsLoading={isResidentsLoading}
          residentDuesSummary={residentDuesSummary}
          paginatedDues={paginatedDues}
          filteredDuesTotal={filteredDues.length}
          duesPage={duesPage}
          duesLimit={duesLimit}
          totalDuesPages={totalDuesPages}
          duesDisbursementList={duesDisbursementList}
          duesListCount={duesList.length}
          onCategoryFilterChange={(id) => {
            setDuesCategoryFilter(id);
            setDuesPage(1);
          }}
          onViewModeChange={setDuesViewMode}
          onStatusFilterChange={(status) => {
            setDuesStatusFilter(status);
            setDuesPage(1);
          }}
          onSearchChange={(search) => {
            setDuesSearch(search);
            setDuesPage(1);
          }}
          onPageChange={setDuesPage}
          onOpenDisburseModal={(catId) => {
            setSelectedDisburseCatId(catId);
            setIsDisburseModalOpen(true);
          }}
          onSelectResident={setSelectedResidentId}
          onVerifyDues={handleVerify}
        />
      )}

      {/* Tab 3: Master Funds */}
      {activeTab === 'master' && (
        <MasterFundsTab
          fundList={fundList}
          catList={catList}
          cashCatsCount={cashCats.length}
          isFundsLoading={isFundsLoading}
          isCatsLoading={isCatsLoading}
          onOpenCashCatModal={() => setIsCashCatModalOpen(true)}
          onOpenAddFundModal={() => {
            setEditingFund(null);
            setIsFundModalOpen(true);
          }}
          onEditFund={(fund) => {
            setEditingFund(fund);
            setIsFundModalOpen(true);
          }}
          onDeleteFund={handleDeleteFund}
          onOpenAddCategoryModal={() => {
            setEditingCategory(null);
            setIsCatModalOpen(true);
          }}
          onEditCategory={(cat) => {
            setEditingCategory(cat);
            setIsCatModalOpen(true);
          }}
          onDeleteCategory={handleDeleteCategory}
        />
      )}

      {/* Modular Modals */}
      <DuesPaymentModal isOpen={isDuesModalOpen} onClose={() => setIsDuesModalOpen(false)} />
      <TransactionModal isOpen={isTxModalOpen} onClose={() => setIsTxModalOpen(false)} />
      {isDisburseModalOpen && (
        <DuesDisbursementModal
          isOpen={isDisburseModalOpen}
          onClose={() => setIsDisburseModalOpen(false)}
          defaultFeeCategoryId={selectedDisburseCatId}
          categoryBalances={duesCategoryBalances}
        />
      )}

      {/* Cash Category Modal */}
      <CashCategoryModal
        isOpen={isCashCatModalOpen}
        onClose={() => setIsCashCatModalOpen(false)}
        cashCats={cashCats}
        onSave={handleSaveCashCategories}
        showFeedback={showFeedback}
      />

      {/* Fee Category Modal */}
      <FeeCategoryModal
        isOpen={isCatModalOpen}
        onClose={() => {
          setIsCatModalOpen(false);
          setEditingCategory(null);
        }}
        category={editingCategory}
        userList={userList}
        onSave={handleSaveFeeCategory}
        isSubmitting={createFeeCat.isPending || updateFeeCat.isPending}
      />

      {/* Fund Modal */}
      <FundModal
        isOpen={isFundModalOpen}
        onClose={() => {
          setIsFundModalOpen(false);
          setEditingFund(null);
        }}
        fund={editingFund}
        userList={userList}
        onSave={handleSaveFund}
        isSubmitting={createFund.isPending || updateFund.isPending}
      />

      {/* Resident Dues History Modal */}
      <ResidentDuesHistoryModal
        isOpen={Boolean(selectedResidentId)}
        onClose={() => setSelectedResidentId(null)}
        selectedResidentId={selectedResidentId}
        residentSummary={residentDuesSummary.find((r) => r.resident_id === selectedResidentId) || null}
        catList={catList}
      />
    </div>
  );
};
