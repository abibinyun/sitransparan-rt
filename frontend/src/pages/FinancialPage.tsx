import React, { useState } from 'react';
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
  useDeleteFund,
} from '../services/financial';
import { DuesPaymentModal } from '../components/DuesPaymentModal';
import { DuesDisbursementModal } from '../components/DuesDisbursementModal';
import { TransactionModal } from '../components/TransactionModal';
import { SimpleDialog } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select } from '../components/ui/select';
import { Plus, Trash2, Wallet, Coins, Search, Users, History, ChevronRight, Edit2 } from 'lucide-react';
import { FeePeriod, FundType } from '../types/financial';
import { getFileUrl } from '../utils/file';
import { useResidents } from '../services/resident';

export const FinancialPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dues' | 'transactions' | 'funds' | 'categories'>('dues');
  const [isDuesModalOpen, setIsDuesModalOpen] = useState(false);
  const [isDisburseModalOpen, setIsDisburseModalOpen] = useState(false);
  const [selectedDisburseCatId, setSelectedDisburseCatId] = useState('');
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isFundModalOpen, setIsFundModalOpen] = useState(false);

  // Sub-tab for categories: iuran vs kas
  const [categorySubTab, setCategorySubTab] = useState<'dues' | 'cash'>('dues');

  // Master Kategori Kas (Fully editable & deletable CRUD)
  const initialCashCategories = [
    { id: 'cat_in_1', name: 'IURAN_WARGA', type: 'income' as const, desc: 'Pemasukan dari iuran warga' },
    { id: 'cat_in_2', name: 'DONASI', type: 'income' as const, desc: 'Donasi & sumbangan sukarela' },
    { id: 'cat_in_3', name: 'DANA_DESA', type: 'income' as const, desc: 'Bantuan dana pemerintah/desa' },
    { id: 'cat_in_4', name: 'LAINNYA_PEMASUKAN', type: 'income' as const, desc: 'Pemasukan insidental lain' },
    { id: 'cat_out_1', name: 'OPERASIONAL_RT', type: 'expense' as const, desc: 'Operasional rutin & keamanan' },
    { id: 'cat_out_2', name: 'KEBERSIHAN', type: 'expense' as const, desc: 'Pengangkutan sampah & kebersihan' },
    { id: 'cat_out_3', name: 'KEGIATAN_WARGA', type: 'expense' as const, desc: 'Acara warga, rapat & perlombaan' },
    { id: 'cat_out_4', name: 'PERBAIKAN_FASILITAS', type: 'expense' as const, desc: 'Perbaikan jalan, pos satpam & lampu' },
    { id: 'cat_out_5', name: 'LAINNYA_PENGELUARAN', type: 'expense' as const, desc: 'Pengeluaran insidental lain' },
  ];

  const [cashCats, setCashCats] = useState<{ id: string; name: string; type: 'income' | 'expense'; desc?: string }[]>(() => {
    try {
      const saved = localStorage.getItem('sitransparan_custom_cash_categories');
      return saved ? JSON.parse(saved) : initialCashCategories;
    } catch {
      return initialCashCategories;
    }
  });
  const [editingCashCat, setEditingCashCat] = useState<{ id: string; name: string; type: 'income' | 'expense'; desc?: string } | null>(null);
  const [newCashCatName, setNewCashCatName] = useState('');
  const [newCashCatType, setNewCashCatType] = useState<'income' | 'expense'>('income');
  const [newCashCatDesc, setNewCashCatDesc] = useState('');

  // Fee category form state
  const [catName, setCatName] = useState('');
  const [catAmount, setCatAmount] = useState<number>(0);
  const [catPeriod, setCatPeriod] = useState<FeePeriod>('monthly');
  const [catDesc, setCatDesc] = useState('');

  // Fund form state
  const [fundName, setFundName] = useState('');
  const [fundType, setFundType] = useState<FundType>('operational');
  const [fundDesc, setFundDesc] = useState('');

  // Filter & Pagination for Dues
  const [duesViewMode, setDuesViewMode] = useState<'resident' | 'history'>('resident');
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(null);
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

  const { data: summary, isLoading: isSummaryLoading } = useFinancialSummary();
  const { data: rawDues, isLoading: isDuesLoading } = useDuesPayments({
    status: duesStatusFilter === 'all' ? undefined : duesStatusFilter,
  });
  const { data: rawTx, isLoading: isTxLoading } = useFinancialTransactions({
    type: txTypeFilter === 'all' ? undefined : txTypeFilter,
  });
  const { data: rawCats, isLoading: isCatsLoading } = useFeeCategories();
  const { data: rawFunds, isLoading: isFundsLoading } = useFunds();
  const { data: rawResidents, isLoading: isResidentsLoading } = useResidents({ limit: 100 });

  const duesList: any[] = Array.isArray(rawDues) ? rawDues : (rawDues as any)?.data || [];
  const txList: any[] = Array.isArray(rawTx) ? rawTx : (rawTx as any)?.data || [];
  const catList: any[] = Array.isArray(rawCats) ? rawCats : (rawCats as any)?.data || [];
  const fundList: any[] = Array.isArray(rawFunds) ? rawFunds : (rawFunds as any)?.data || [];
  const residentList: any[] = Array.isArray(rawResidents) ? rawResidents : (rawResidents as any)?.data || [];

  const verifyDues = useVerifyDuesPayment();
  const createFeeCat = useCreateFeeCategory();
  const deleteFeeCat = useDeleteFeeCategory();
  const createFund = useCreateFund();
  const deleteFund = useDeleteFund();
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Calculate dynamic collected dues and spent dues per fee category
  const duesCategoryBalances = React.useMemo(() => {
    const balances: Record<string, { collected: number; spent: number; balance: number; verifiedCount: number; pendingCount: number }> = {};
    for (const cat of catList) {
      balances[cat.id] = { collected: 0, spent: 0, balance: 0, verifiedCount: 0, pendingCount: 0 };
    }
    // Track verified income from resident dues
    for (const d of duesList) {
      if (d.fee_category_id && balances[d.fee_category_id]) {
        if (d.status === 'verified') {
          balances[d.fee_category_id].collected += Number(d.amount) || 0;
          balances[d.fee_category_id].verifiedCount += 1;
        } else if (d.status === 'pending') {
          balances[d.fee_category_id].pendingCount += 1;
        }
      }
    }
    // Track expense recorded for specific dues category
    for (const tx of txList) {
      if (tx.type === 'expense' && tx.category) {
        // match category format 'IURAN_KELUAR: {name}' or exact name
        for (const cat of catList) {
          const keluarPrefix = `IURAN_KELUAR: ${cat.name}`;
          if (tx.category === keluarPrefix || tx.category === cat.name || tx.category === `IURAN: ${cat.name}`) {
            balances[cat.id].spent += Number(tx.amount) || 0;
          }
        }
      }
    }
    // Calculate net remaining balance
    for (const cat of catList) {
      balances[cat.id].balance = balances[cat.id].collected - balances[cat.id].spent;
    }
    return balances;
  }, [catList, duesList, txList]);

  // Group dues by resident (Buku Iuran per Warga)
  const residentDuesSummary = React.useMemo(() => {
    // Map resident details
    const resMap: Record<string, {
      resident_id: string;
      resident_name: string;
      total_paid: number;
      pending_count: number;
      verified_count: number;
      categories: Record<string, { category_name: string; count: number; total: number; latest_period: string; status: string }>;
      items: any[];
    }> = {};

    // First populate from registered residents if available
    for (const r of residentList) {
      resMap[r.id] = {
        resident_id: r.id,
        resident_name: r.full_name,
        total_paid: 0,
        pending_count: 0,
        verified_count: 0,
        categories: {},
        items: [],
      };
    }

    // Populate from dues records
    for (const d of duesList) {
      const resId = d.resident_id || 'unknown';
      if (!resMap[resId]) {
        resMap[resId] = {
          resident_id: resId,
          resident_name: d.resident_name || 'Warga ' + resId.slice(0, 8),
          total_paid: 0,
          pending_count: 0,
          verified_count: 0,
          categories: {},
          items: [],
        };
      }

      const res = resMap[resId];
      res.items.push(d);

      const catName = d.fee_category_name || 'Iuran Lainnya';
      if (!res.categories[catName]) {
        res.categories[catName] = {
          category_name: catName,
          count: 0,
          total: 0,
          latest_period: `${d.period_month}/${d.period_year}`,
          status: d.status,
        };
      }

      if (d.status === 'verified') {
        res.total_paid += Number(d.amount) || 0;
        res.verified_count += 1;
        res.categories[catName].total += Number(d.amount) || 0;
        res.categories[catName].count += 1;
      } else if (d.status === 'pending') {
        res.pending_count += 1;
      }
    }

    // Convert to list & filter by search
    let list = Object.values(resMap);
    if (duesSearch.trim()) {
      const q = duesSearch.toLowerCase();
      list = list.filter((r) => r.resident_name.toLowerCase().includes(q));
    }
    // Sort: residents with most activity first
    list.sort((a, b) => b.total_paid - a.total_paid || b.items.length - a.items.length);
    return list;
  }, [duesList, residentList, duesSearch]);

  // Filter & paginate dues list client-side with search
  const filteredDues = React.useMemo(() => {
    return duesList.filter((d) => {
      if (duesStatusFilter !== 'all' && d.status !== duesStatusFilter) return false;
      if (duesSearch.trim()) {
        const query = duesSearch.toLowerCase();
        const residentName = (d.resident_name || '').toLowerCase();
        const catName = (d.fee_category_name || '').toLowerCase();
        if (!residentName.includes(query) && !catName.includes(query)) return false;
      }
      return true;
    });
  }, [duesList, duesStatusFilter, duesSearch]);

  const totalDuesPages = Math.max(1, Math.ceil(filteredDues.length / duesLimit));
  const paginatedDues = React.useMemo(() => {
    const start = (duesPage - 1) * duesLimit;
    return filteredDues.slice(start, start + duesLimit);
  }, [filteredDues, duesPage, duesLimit]);

  // Filter & paginate transactions list client-side with search & fund filter
  const filteredTransactions = React.useMemo(() => {
    return txList.filter((t) => {
      if (txTypeFilter !== 'all' && t.type !== txTypeFilter) return false;
      if (txFundFilter !== 'all') {
        if (txFundFilter === '__none__' && t.fund_id) return false;
        if (txFundFilter !== '__none__' && t.fund_id !== txFundFilter) return false;
      }
      if (txSearch.trim()) {
        const query = txSearch.toLowerCase();
        const cat = (t.category || '').toLowerCase();
        const desc = (t.description || '').toLowerCase();
        const fundName = (t.fund_name || '').toLowerCase();
        if (!cat.includes(query) && !desc.includes(query) && !fundName.includes(query)) return false;
      }
      return true;
    });
  }, [txList, txTypeFilter, txFundFilter, txSearch]);

  const totalTxPages = Math.max(1, Math.ceil(filteredTransactions.length / txLimit));
  const paginatedTx = React.useMemo(() => {
    const start = (txPage - 1) * txLimit;
    return filteredTransactions.slice(start, start + txLimit);
  }, [filteredTransactions, txPage, txLimit]);

  const handleVerify = async (id: string, status: 'verified' | 'rejected') => {
    try {
      await verifyDues.mutateAsync({ id, status });
      showFeedback('success', `Status iuran berhasil diubah.`);
    } catch (err: any) {
      showFeedback('error', err?.response?.data?.error || 'Gagal memperbarui status verifikasi.');
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
      showFeedback('success', 'Kategori iuran berhasil ditambahkan.');
    } catch (err: any) {
      showFeedback('error', err?.response?.data?.error || 'Gagal membuat kategori iuran.');
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

  const handleSaveCashCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCashCatName.trim()) return;
    const formattedName = newCashCatName.trim().toUpperCase().replace(/\s+/g, '_');

    if (editingCashCat) {
      const updated = cashCats.map((c) =>
        c.id === editingCashCat.id
          ? { ...c, name: formattedName, type: newCashCatType, desc: newCashCatDesc.trim() || undefined }
          : c
      );
      setCashCats(updated);
      try {
        localStorage.setItem('sitransparan_custom_cash_categories', JSON.stringify(updated));
      } catch {}
      setEditingCashCat(null);
      showFeedback('success', `Kategori kas ${formattedName} berhasil diperbarui.`);
    } else {
      const catObj = {
        id: 'cash_cat_' + Date.now(),
        name: formattedName,
        type: newCashCatType,
        desc: newCashCatDesc.trim() || undefined,
      };
      const updated = [...cashCats, catObj];
      setCashCats(updated);
      try {
        localStorage.setItem('sitransparan_custom_cash_categories', JSON.stringify(updated));
      } catch {}
      showFeedback('success', `Kategori kas ${formattedName} berhasil ditambahkan.`);
    }
    setNewCashCatName('');
    setNewCashCatDesc('');
    setNewCashCatType('income');
  };

  const handleEditCashCat = (cat: { id: string; name: string; type: 'income' | 'expense'; desc?: string }) => {
    setEditingCashCat(cat);
    setNewCashCatName(cat.name);
    setNewCashCatType(cat.type);
    setNewCashCatDesc(cat.desc || '');
  };

  const handleDeleteCashCat = (id: string, name: string) => {
    if (confirm(`Hapus kategori kas "${name}" ini?`)) {
      const updated = cashCats.filter((c) => c.id !== id);
      setCashCats(updated);
      try {
        localStorage.setItem('sitransparan_custom_cash_categories', JSON.stringify(updated));
      } catch {}
      if (editingCashCat?.id === id) {
        setEditingCashCat(null);
        setNewCashCatName('');
        setNewCashCatDesc('');
      }
      showFeedback('success', `Kategori kas "${name}" berhasil dihapus.`);
    }
  };

  const handleCreateFund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fundName) return;
    try {
      await createFund.mutateAsync({
        name: fundName,
        type: fundType,
        description: fundDesc || undefined,
      });
      setIsFundModalOpen(false);
      setFundName('');
      setFundType('operational');
      setFundDesc('');
      showFeedback('success', 'Kantong kas berhasil ditambahkan.');
    } catch (err: any) {
      showFeedback('error', err?.response?.data?.error || 'Gagal membuat kantong kas.');
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Transparansi Keuangan RT</h2>
          <p className="text-sm text-gray-500">Pemisahan tegas Iuran Warga vs Arus Kas Buku Utama</p>
        </div>
        {/* Top 3 Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setIsDuesModalOpen(true)}
            className="bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 gap-1.5"
          >
            <Coins className="h-4 w-4" /> + Bayar / Catat Iuran
          </Button>
          <Button
            onClick={() => setIsTxModalOpen(true)}
            className="bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 gap-1.5"
          >
            <Wallet className="h-4 w-4" /> + Transaksi Kas RT
          </Button>
          <Button
            onClick={() => setIsFundModalOpen(true)}
            variant="outline"
            className="border-indigo-300 bg-indigo-50/50 text-indigo-700 hover:bg-indigo-100 gap-1.5"
          >
            <Plus className="h-4 w-4" /> + Kantong Kas Baru
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Masuk (Income)</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Gabungan Kas & Iuran Warga</p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-700">Global</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-green-600">
            {isSummaryLoading ? '...' : `Rp ${(summary?.monthly_income || 0).toLocaleString('id-ID')}`}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Keluar (Expense)</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Pengeluaran Operasional & Acara</p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700">Global</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-red-600">
            {isSummaryLoading ? '...' : `Rp ${(summary?.monthly_expense || 0).toLocaleString('id-ID')}`}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Dana</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Total Kas Semua Kantong Termasuk Iuran</p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700">Global</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-indigo-600">
            {isSummaryLoading ? '...' : `Rp ${(summary?.current_balance || 0).toLocaleString('id-ID')}`}
          </p>
        </div>
      </div>

      {/* Dynamic Cards: Multi-Fund Overview Cards */}
      {fundList.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Wallet className="h-4 w-4 text-indigo-600" /> Saldo Real-Time Kantong Kas
            </h3>
            <button
              onClick={() => setActiveTab('funds')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Buka Manajemen Kantong Kas →
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {fundList.map((f: any) => (
              <div
                key={f.id}
                className={`p-3.5 rounded-lg border bg-white shadow-xs transition-all ${
                  f.is_default ? 'border-indigo-300 ring-1 ring-indigo-200 bg-indigo-50/10' : 'border-slate-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-semibold text-slate-800">{f.name}</span>
                    {f.is_default && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
                        Default
                      </span>
                    )}
                    <p className="text-[11px] text-slate-400 mt-0.5">{f.description || f.type}</p>
                  </div>
                  <span
                    className={`text-sm font-bold ${
                      (f.balance || 0) >= 0 ? 'text-slate-900' : 'text-rose-600'
                    }`}
                  >
                    Rp {(f.balance || 0).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dynamic Cards: Real-Time Saldo per Kategori Iuran */}
      {catList.length > 0 && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-emerald-900 flex items-center gap-1.5">
                <Coins className="h-4 w-4 text-emerald-600" /> Saldo & Alokasi per Pos Iuran Warga
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Saldo bersih = Total iuran masuk dikurangi pengeluaran/penyaluran iuran terkait</p>
            </div>
            <button
              onClick={() => {
                setActiveTab('categories');
                setCategorySubTab('dues');
              }}
              className="text-xs text-emerald-700 hover:text-emerald-900 font-medium"
            >
              Master Pos Iuran →
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {catList.map((c: any) => {
              const b = duesCategoryBalances[c.id] || { collected: 0, spent: 0, balance: 0, verifiedCount: 0, pendingCount: 0 };
              return (
                <div key={c.id} className="p-3.5 rounded-lg border border-emerald-200 bg-white shadow-xs space-y-2.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-semibold text-slate-800">{c.name}</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Tarif: Rp {Number(c.amount).toLocaleString('id-ID')} ({c.period === 'monthly' ? 'Bln' : '1x'})
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-bold ${b.balance >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                        Rp {b.balance.toLocaleString('id-ID')}
                      </span>
                      <p className="text-[9px] text-slate-400">Sisa Saldo</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-[10px] pt-1.5 border-t border-slate-100 text-slate-500">
                    <span>Masuk: <strong className="text-emerald-600">Rp {b.collected.toLocaleString('id-ID')}</strong></span>
                    <span>Keluar: <strong className="text-rose-600">Rp {b.spent.toLocaleString('id-ID')}</strong></span>
                  </div>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDisburseCatId(c.id);
                        setIsDisburseModalOpen(true);
                      }}
                      className="w-full py-1 text-[11px] font-semibold rounded bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors"
                    >
                      Keluarkan / Salurkan Dana →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('dues')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-all ${
              activeTab === 'dues'
                ? 'border-indigo-500 text-indigo-600 font-bold'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Iuran Warga ({duesList.length})
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-all ${
              activeTab === 'transactions'
                ? 'border-indigo-500 text-indigo-600 font-bold'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Transaksi Kas RT ({txList.length})
          </button>
          <button
            onClick={() => setActiveTab('funds')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-all ${
              activeTab === 'funds'
                ? 'border-indigo-500 text-indigo-600 font-bold'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Kantong Kas ({fundList.length})
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-all ${
              activeTab === 'categories'
                ? 'border-indigo-500 text-indigo-600 font-bold'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Master Kategori Iuran & Kas
          </button>
        </nav>
      </div>

      {/* Tab Content: Dues (Iuran Warga) */}
      {activeTab === 'dues' && (
        <div className="space-y-4">
          {/* Sub-view Toggle: Per Warga vs Riwayat Transaksi */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-xs">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1 text-xs font-semibold">
                <button
                  onClick={() => setDuesViewMode('resident')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                    duesViewMode === 'resident'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="h-3.5 w-3.5" /> Buku Iuran per Warga ({residentDuesSummary.length})
                </button>
                <button
                  onClick={() => setDuesViewMode('history')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                    duesViewMode === 'history'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <History className="h-3.5 w-3.5" /> Riwayat Transaksi ({duesList.length})
                </button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedDisburseCatId('');
                  setIsDisburseModalOpen(true);
                }}
                className="text-xs h-8 gap-1.5 border-rose-200 bg-rose-50/50 text-rose-700 hover:bg-rose-100"
                title="Catat pengeluaran yang memotong dana dari pos iuran warga"
              >
                <Wallet className="h-3.5 w-3.5" /> Salurkan / Pakai Dana Iuran
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              {duesViewMode === 'history' && (
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold">
                  {(['all', 'pending', 'verified', 'rejected'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => {
                        setDuesStatusFilter(st);
                        setDuesPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-md transition-all capitalize ${
                        duesStatusFilter === st
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {st === 'all' ? 'Semua' : st}
                    </button>
                  ))}
                </div>
              )}
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder={duesViewMode === 'resident' ? 'Cari nama warga...' : 'Cari nama / jenis iuran...'}
                  value={duesSearch}
                  onChange={(e) => {
                    setDuesSearch(e.target.value);
                    setDuesPage(1);
                  }}
                  className="pl-8 text-xs h-9 bg-white"
                />
              </div>
            </div>
          </div>

          {/* View 1: Buku Iuran per Warga (Matriks Apa Saja yang Sudah Dibayar) */}
          {duesViewMode === 'resident' && (
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50/70 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-sm text-gray-900">Rekapitulasi Iuran Setiap Warga</h3>
                  <p className="text-xs text-gray-500">
                    Melihat pos iuran apa saja yang sudah lunas dan status pembayaran masing-masing warga
                  </p>
                </div>
              </div>

              {isDuesLoading || isResidentsLoading ? (
                <div className="p-6 text-center text-gray-500">Memuat rekapitulasi iuran warga...</div>
              ) : residentDuesSummary.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  {duesSearch ? 'Tidak ada data warga yang cocok dengan pencarian.' : 'Belum ada data warga terdaftar.'}
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {residentDuesSummary.map((res) => {
                    const catEntries = Object.values(res.categories);
                    return (
                      <div key={res.resident_id} className="p-4 hover:bg-slate-50/60 transition-colors">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900">{res.resident_name}</span>
                              {res.pending_count > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                  {res.pending_count} Perlu Verifikasi
                                </span>
                              )}
                              {res.verified_count > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  {res.verified_count} Transaksi Lunas
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500">
                              Total Disetor: <strong className="text-slate-900">Rp {res.total_paid.toLocaleString('id-ID')}</strong> ({res.items.length} catatan pembayaran)
                            </p>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedResidentId(res.resident_id)}
                            className="text-xs h-8 gap-1.5 self-start sm:self-auto border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                          >
                            Rincian Pembayaran <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        {/* Badges of paid categories */}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {catEntries.length === 0 ? (
                            <span className="text-[11px] text-slate-400 italic">Belum ada riwayat pembayaran iuran</span>
                          ) : (
                            catEntries.map((c) => (
                              <div
                                key={c.category_name}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs"
                              >
                                <span className="font-semibold text-slate-700">{c.category_name}:</span>
                                <span className="text-emerald-700 font-bold">
                                  Rp {c.total.toLocaleString('id-ID')}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  ({c.count}x bayar • {c.latest_period})
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* View 2: Riwayat Transaksi Iuran (Tabel Lengkap dengan Verifikasi & Filter) */}
          {duesViewMode === 'history' && (
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
              {isDuesLoading ? (
                <div className="p-6 text-center text-gray-500">Memuat data iuran...</div>
              ) : filteredDues.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  {duesSearch || duesStatusFilter !== 'all'
                    ? 'Tidak ada data iuran yang cocok dengan filter.'
                    : 'Belum ada riwayat iuran warga'}
                </div>
              ) : (
                <>
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
                      {paginatedDues.map((item: any) => (
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
                                href={getFileUrl(item.proof_url)}
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
                                  className="text-green-600 hover:text-green-900 font-semibold"
                                >
                                  Verifikasi
                                </button>
                                <button
                                  onClick={() => handleVerify(item.id, 'rejected')}
                                  className="text-red-600 hover:text-red-900 font-semibold"
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

                  {/* Pagination */}
                  <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50/50">
                    <span className="text-xs text-slate-500">
                      Menampilkan {paginatedDues.length} dari {filteredDues.length} iuran
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={duesPage <= 1}
                        onClick={() => setDuesPage((p) => p - 1)}
                      >
                        Sebelumnya
                      </Button>
                      <span className="text-xs font-semibold text-slate-700 px-2">
                        {duesPage} / {totalDuesPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={duesPage >= totalDuesPages}
                        onClick={() => setDuesPage((p) => p + 1)}
                      >
                        Selanjutnya
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Transactions (Buku Kas RT) */}
      {activeTab === 'transactions' && (
        <div className="space-y-3">
          {/* Controls: Filter & Search */}
          <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold">
                <button
                  onClick={() => {
                    setTxTypeFilter('all');
                    setTxPage(1);
                  }}
                  className={`px-3 py-1 rounded-md transition-all ${
                    txTypeFilter === 'all' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Semua Arus
                </button>
                <button
                  onClick={() => {
                    setTxTypeFilter('income');
                    setTxPage(1);
                  }}
                  className={`px-3 py-1 rounded-md transition-all ${
                    txTypeFilter === 'income' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Pemasukan
                </button>
                <button
                  onClick={() => {
                    setTxTypeFilter('expense');
                    setTxPage(1);
                  }}
                  className={`px-3 py-1 rounded-md transition-all ${
                    txTypeFilter === 'expense' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Pengeluaran
                </button>
              </div>

              {fundList.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="txFundFilter" className="text-xs text-slate-500 whitespace-nowrap">
                    Kantong:
                  </Label>
                  <Select
                    id="txFundFilter"
                    value={txFundFilter}
                    onChange={(e) => {
                      setTxFundFilter(e.target.value);
                      setTxPage(1);
                    }}
                    className="text-xs h-8 py-0"
                  >
                    <option value="all">Semua Kantong Kas</option>
                    {fundList.map((f: any) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Cari kategori / deskripsi..."
                value={txSearch}
                onChange={(e) => {
                  setTxSearch(e.target.value);
                  setTxPage(1);
                }}
                className="pl-8 text-xs h-9"
              />
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
            {isTxLoading ? (
              <div className="p-6 text-center text-gray-500">Memuat data transaksi...</div>
            ) : filteredTransactions.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                {txSearch || txTypeFilter !== 'all' || txFundFilter !== 'all'
                  ? 'Tidak ada transaksi yang cocok dengan filter.'
                  : 'Belum ada transaksi kas'}
              </div>
            ) : (
              <>
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
                        Kantong Kas
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
                    {paginatedTx.map((tx: any) => (
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
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700 font-medium">
                          {tx.fund_name || 'Kas RT'}
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
                              href={getFileUrl(tx.proof_url)}
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

                {/* Pagination */}
                <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50/50">
                  <span className="text-xs text-slate-500">
                    Menampilkan {paginatedTx.length} dari {filteredTransactions.length} transaksi
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={txPage <= 1}
                      onClick={() => setTxPage((p) => p - 1)}
                    >
                      Sebelumnya
                    </Button>
                    <span className="text-xs font-semibold text-slate-700 px-2">
                      {txPage} / {totalTxPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={txPage >= totalTxPages}
                      onClick={() => setTxPage((p) => p + 1)}
                    >
                      Selanjutnya
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tab Content: Funds (Kantong Kas Multi-Fund) */}
      {activeTab === 'funds' && (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <div>
              <h3 className="font-semibold text-gray-900">Daftar Kantong Kas RT (Multi-Fund)</h3>
              <p className="text-xs text-gray-500">Pemisahan dana kas khusus operasional, sosial, kepemudaan, atau pembangunan</p>
            </div>
            <Button size="sm" onClick={() => setIsFundModalOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Tambah Kantong Kas
            </Button>
          </div>
          {isFundsLoading ? (
            <div className="p-6 text-center text-gray-500">Memuat data kantong kas...</div>
          ) : fundList.length === 0 ? (
            <div className="p-6 text-center text-gray-500">Belum ada kantong kas</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Nama Kantong Kas</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Tipe</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Saldo Saat Ini</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Deskripsi / Peruntukan</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {fundList.map((f: any) => (
                  <tr key={f.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-gray-900">
                      {f.name} {f.is_default && <span className="ml-2 px-1.5 py-0.5 rounded text-xs bg-indigo-100 text-indigo-700 font-bold">Utama</span>}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                      <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700">
                        {f.type}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-bold text-gray-900">
                      Rp {(f.balance || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{f.description || '-'}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                      {!f.is_default && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteFund(f.id, f.is_default)}
                          className="text-red-600 hover:text-red-800"
                          title="Hapus Kantong Kas"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab Content: Master Categories (Pemisahan Kategori Iuran vs Kategori Kas) */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          {/* Sub-tab selection: Iuran vs Kas */}
          <div className="flex border-b border-gray-200 gap-4">
            <button
              onClick={() => setCategorySubTab('dues')}
              className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
                categorySubTab === 'dues'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              1. Master Kategori & Tarif Iuran Warga ({catList.length})
            </button>
            <button
              onClick={() => setCategorySubTab('cash')}
              className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
                categorySubTab === 'cash'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              2. Master Kategori Kas Masuk & Keluar ({cashCats.length})
            </button>
          </div>

          {categorySubTab === 'dues' && (
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <div>
                  <h3 className="font-semibold text-gray-900">Daftar Jenis / Tarif Iuran Warga</h3>
                  <p className="text-xs text-gray-500">
                    Pos iuran kewajiban warga (misal: Iuran Sampah, Keamanan, Kas Lingkungan)
                  </p>
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

          {categorySubTab === 'cash' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Kategori Pemasukan */}
                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-sm text-emerald-800 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Kategori Kas Masuk (Income)
                    </h4>
                    <span className="text-xs text-slate-400">
                      {cashCats.filter((c) => c.type === 'income').length} kategori
                    </span>
                  </div>
                  <ul className="divide-y divide-slate-100 text-xs text-slate-700 max-h-72 overflow-y-auto">
                    {cashCats.filter((c) => c.type === 'income').length === 0 ? (
                      <li className="py-4 text-center text-slate-400 italic">Belum ada kategori pemasukan.</li>
                    ) : (
                      cashCats.filter((c) => c.type === 'income').map((c) => (
                        <li key={c.id} className="py-2.5 flex justify-between items-center hover:bg-slate-50 px-1 rounded">
                          <div>
                            <span className="font-semibold text-emerald-950">{c.name}</span>
                            {c.desc && <p className="text-[10px] text-slate-400 font-normal">{c.desc}</p>}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditCashCat(c)}
                              className="text-indigo-600 hover:text-indigo-800 h-7 w-7 p-0"
                              title="Edit Kategori"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCashCat(c.id, c.name)}
                              className="text-rose-600 hover:text-rose-800 h-7 w-7 p-0"
                              title="Hapus Kategori"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </li>
                      ))
                    )}
                  </ul>
                </div>

                {/* Kategori Pengeluaran */}
                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-sm text-rose-800 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-rose-500"></span> Kategori Kas Keluar (Expense)
                    </h4>
                    <span className="text-xs text-slate-400">
                      {cashCats.filter((c) => c.type === 'expense').length} kategori
                    </span>
                  </div>
                  <ul className="divide-y divide-slate-100 text-xs text-slate-700 max-h-72 overflow-y-auto">
                    {cashCats.filter((c) => c.type === 'expense').length === 0 ? (
                      <li className="py-4 text-center text-slate-400 italic">Belum ada kategori pengeluaran.</li>
                    ) : (
                      cashCats.filter((c) => c.type === 'expense').map((c) => (
                        <li key={c.id} className="py-2.5 flex justify-between items-center hover:bg-slate-50 px-1 rounded">
                          <div>
                            <span className="font-semibold text-rose-950">{c.name}</span>
                            {c.desc && <p className="text-[10px] text-slate-400 font-normal">{c.desc}</p>}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditCashCat(c)}
                              className="text-indigo-600 hover:text-indigo-800 h-7 w-7 p-0"
                              title="Edit Kategori"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCashCat(c.id, c.name)}
                              className="text-rose-600 hover:text-rose-800 h-7 w-7 p-0"
                              title="Hapus Kategori"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>

              {/* Form Tambah / Edit Kategori Kas */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="mb-4 flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-sm text-slate-900">
                      {editingCashCat ? `Edit Kategori Kas: ${editingCashCat.name}` : 'Tambah Master Kategori Kas Baru'}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {editingCashCat
                        ? 'Perbarui nama atau keterangan kategori kas yang dipilih'
                        : 'Buat pos kategori baru untuk transaksi kas buku besar RT'}
                    </p>
                  </div>
                  {editingCashCat && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingCashCat(null);
                        setNewCashCatName('');
                        setNewCashCatDesc('');
                        setNewCashCatType('income');
                      }}
                      className="text-xs h-8"
                    >
                      Batal Edit
                    </Button>
                  )}
                </div>
                <form onSubmit={handleSaveCashCategory} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="newCashCatName" className="text-xs font-medium text-slate-700">Nama Kategori *</Label>
                      <Input
                        id="newCashCatName"
                        placeholder="Contoh: BANTUAN_DUKA, POSYANDU"
                        value={newCashCatName}
                        onChange={(e) => setNewCashCatName(e.target.value)}
                        className="text-xs h-10 bg-slate-50/50"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="newCashCatType" className="text-xs font-medium text-slate-700">Tipe Kas *</Label>
                      <Select
                        id="newCashCatType"
                        value={newCashCatType}
                        onChange={(e) => setNewCashCatType(e.target.value as any)}
                        className="text-xs h-10 bg-slate-50/50"
                      >
                        <option value="income">Pemasukan (Income)</option>
                        <option value="expense">Pengeluaran (Expense)</option>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="newCashCatDesc" className="text-xs font-medium text-slate-700">Keterangan (Opsional)</Label>
                      <Input
                        id="newCashCatDesc"
                        placeholder="Catatan peruntukan pos kas"
                        value={newCashCatDesc}
                        onChange={(e) => setNewCashCatDesc(e.target.value)}
                        className="text-xs h-10 bg-slate-50/50"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button type="submit" size="sm" className="gap-1.5 px-4 h-9 font-medium">
                      {editingCashCat ? (
                        <>
                          <Edit2 className="h-4 w-4" /> Simpan Perubahan Kategori
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" /> Simpan Kategori Kas
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
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
            <Label htmlFor="catName">Nama Jenis Iuran *</Label>
            <Input
              id="catName"
              type="text"
              placeholder="Contoh: Iuran Sampah, Iuran Warga Bulanan"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="catAmount">Nominal Tarif (Rp) *</Label>
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
          <div className="space-y-1.5">
            <Label htmlFor="catDesc">Keterangan (Opsional)</Label>
            <Input
              id="catDesc"
              type="text"
              placeholder="Contoh: Meliputi kebersihan lingkungan dan pos satpam"
              value={catDesc}
              onChange={(e) => setCatDesc(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsCatModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit">Simpan Kategori</Button>
          </div>
        </form>
      </SimpleDialog>

      {/* Master Kantong Kas (Fund) Modal */}
      <SimpleDialog
        isOpen={isFundModalOpen}
        onClose={() => setIsFundModalOpen(false)}
        title="Tambah Kantong Kas Baru"
      >
        <form onSubmit={handleCreateFund} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fundName">Nama Kantong Kas *</Label>
            <Input
              id="fundName"
              type="text"
              placeholder="Contoh: Dana Peringatan HUT RI, Kas Karang Taruna"
              value={fundName}
              onChange={(e) => setFundName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fundType">Tipe / Kategori Kas *</Label>
            <Select
              id="fundType"
              value={fundType}
              onChange={(e) => setFundType(e.target.value as FundType)}
            >
              <option value="operational">Operasional & Lingkungan</option>
              <option value="social">Sosial & Dana Duka</option>
              <option value="youth">Kepemudaan / Karang Taruna</option>
              <option value="infrastructure">Pembangunan & Fasilitas</option>
              <option value="other">Lain-lain</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fundDesc">Deskripsi / Tujuan Kas</Label>
            <Input
              id="fundDesc"
              type="text"
              placeholder="Contoh: Khusus kegiatan pemuda dan lomba kemerdekaan"
              value={fundDesc}
              onChange={(e) => setFundDesc(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsFundModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit">Simpan Kantong Kas</Button>
          </div>
        </form>
      </SimpleDialog>

      {/* Modal Detail Rincian Iuran Per Warga */}
      <SimpleDialog
        isOpen={!!selectedResidentId}
        onClose={() => setSelectedResidentId(null)}
        title={`Rincian Iuran: ${residentDuesSummary.find((r) => r.resident_id === selectedResidentId)?.resident_name || 'Warga'}`}
      >
        {(() => {
          const res = residentDuesSummary.find((r) => r.resident_id === selectedResidentId);
          if (!res) return null;
          return (
            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-indigo-50/60 border border-indigo-100 flex justify-between items-center">
                <div>
                  <span className="font-semibold text-slate-700">Total Telah Lunas:</span>
                  <div className="text-lg font-bold text-indigo-700">
                    Rp {res.total_paid.toLocaleString('id-ID')}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-500">Status Pembayaran:</span>
                  <div className="font-medium text-slate-800">
                    {res.verified_count} Lunas • {res.pending_count} Menunggu
                  </div>
                </div>
              </div>

              <div>
                <h5 className="font-bold text-slate-800 mb-2">Pos Iuran yang Sudah Dibayar</h5>
                <div className="space-y-1.5">
                  {Object.values(res.categories).length === 0 ? (
                    <div className="p-3 text-center text-slate-400 italic bg-slate-50 rounded-lg">
                      Belum pernah membayar pos iuran apa pun.
                    </div>
                  ) : (
                    Object.values(res.categories).map((c) => (
                      <div
                        key={c.category_name}
                        className="p-2.5 rounded-lg border border-slate-200 bg-white flex justify-between items-center"
                      >
                        <div>
                          <span className="font-bold text-slate-900">{c.category_name}</span>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Total {c.count}x bayar (Terakhir: {c.latest_period})
                          </p>
                        </div>
                        <span className="font-bold text-emerald-700">
                          Rp {c.total.toLocaleString('id-ID')}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h5 className="font-bold text-slate-800 mb-2">Riwayat Pembayaran Lengkap</h5>
                <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {res.items.length === 0 ? (
                    <div className="p-3 text-center text-slate-400 italic">Tidak ada transaksi</div>
                  ) : (
                    res.items.map((item) => (
                      <div key={item.id} className="p-2.5 flex justify-between items-center bg-white hover:bg-slate-50">
                        <div>
                          <span className="font-medium text-slate-800">
                            {item.fee_category_name || 'Iuran'} ({item.period_month}/{item.period_year})
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                item.status === 'verified'
                                  ? 'bg-green-100 text-green-800'
                                  : item.status === 'rejected'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {item.status}
                            </span>
                            {item.proof_url && (
                              <a
                                href={getFileUrl(item.proof_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-600 underline text-[10px]"
                              >
                                Bukti
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-900">
                            Rp {Number(item.amount).toLocaleString('id-ID')}
                          </span>
                          {item.status === 'pending' && (
                            <div className="flex gap-1.5 justify-end mt-1">
                              <button
                                onClick={() => handleVerify(item.id, 'verified')}
                                className="text-green-600 hover:text-green-800 font-bold text-[10px]"
                              >
                                Verifikasi
                              </button>
                              <button
                                onClick={() => handleVerify(item.id, 'rejected')}
                                className="text-red-600 hover:text-red-800 font-bold text-[10px]"
                              >
                                Tolak
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <Button size="sm" variant="outline" onClick={() => setSelectedResidentId(null)}>
                  Tutup
                </Button>
              </div>
            </div>
          );
        })()}
      </SimpleDialog>

      {/* Modal Khusus Penyaluran / Pengeluaran Pos Iuran Warga */}
      <DuesDisbursementModal
        isOpen={isDisburseModalOpen}
        onClose={() => setIsDisburseModalOpen(false)}
        defaultFeeCategoryId={selectedDisburseCatId}
        categoryBalances={duesCategoryBalances}
      />
    </div>
  );
};
