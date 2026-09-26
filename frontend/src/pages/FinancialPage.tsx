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
import { DuesPaymentModal } from '../components/DuesPaymentModal';
import { DuesDisbursementModal } from '../components/DuesDisbursementModal';
import { TransactionModal } from '../components/TransactionModal';
import { SimpleDialog } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select } from '../components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/table';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Plus, Trash2, Wallet, Coins, Search, Users, ChevronRight, Edit2, ArrowDownRight, ArrowUpRight, RotateCcw } from 'lucide-react';
import { FeePeriod, FundType } from '../types/financial';
import { getFileUrl } from '../utils/file';
import { useResidents } from '../services/resident';

export const FinancialPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'transactions' | 'dues' | 'master'>('transactions');
  const [isDuesModalOpen, setIsDuesModalOpen] = useState(false);
  const [isDisburseModalOpen, setIsDisburseModalOpen] = useState(false);
  const [selectedDisburseCatId, setSelectedDisburseCatId] = useState('');
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isFundModalOpen, setIsFundModalOpen] = useState(false);
  const [isCashCatModalOpen, setIsCashCatModalOpen] = useState(false);
  const [editingFund, setEditingFund] = useState<any | null>(null);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);

  // Users list untuk pemilihan PIC
  const { data: usersData } = useUsers(100, 0);
  const userList = usersData?.data || [];

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
  const [catPicUserId, setCatPicUserId] = useState<string>('');

  // Fund form state
  const [fundName, setFundName] = useState('');
  const [fundType, setFundType] = useState<FundType>('operational');
  const [fundDesc, setFundDesc] = useState('');
  const [fundPicUserId, setFundPicUserId] = useState<string>('');

  // Filter & Pagination for Dues
  const [duesViewMode, setDuesViewMode] = useState<'resident' | 'history' | 'disbursements'>('resident');
  const [duesCategoryFilter, setDuesCategoryFilter] = useState<string>('all');
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(null);
  const [modalDuesYearFilter, setModalDuesYearFilter] = useState<string>('all');
  const [modalDuesCategoryFilter, setModalDuesCategoryFilter] = useState<string>('all');
  const [modalDuesPage, setModalDuesPage] = useState<number>(1);
  const MODAL_PAGE_SIZE = 10;
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
  const { data: rawDues, isLoading: isDuesLoading } = useDuesPayments();
  const { data: rawTx, isLoading: isTxLoading } = useFinancialTransactions();
  const { data: rawCats, isLoading: isCatsLoading } = useFeeCategories();
  const { data: rawFunds, isLoading: isFundsLoading } = useFunds();
  const { data: rawResidents, isLoading: isResidentsLoading } = useResidents({ limit: 100 });
  const { user } = useAuthStore();
  const { data: houseData } = useMyHouseQuery();
  const isResident = String(user?.role || '').toLowerCase() === 'resident';
  const head = houseData?.head_resident;

  // Jika pengguna adalah resident, batasi duesList hanya milik dirinya / kepala keluarga KK-nya
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
  const catList: any[] = Array.isArray(rawCats) ? rawCats : (rawCats as any)?.data || [];
  const fundList: any[] = Array.isArray(rawFunds) ? rawFunds : (rawFunds as any)?.data || [];
  const residentList: any[] = Array.isArray(rawResidents) ? rawResidents : (rawResidents as any)?.data || [];

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
    // Track expense recorded for specific dues category or transferred to funds
    for (const tx of txList) {
      if (tx.category) {
        for (const cat of catList) {
          const keluarPrefix = `IURAN_KELUAR: ${cat.name}`;
          const transferPrefix = `IURAN_PINDAH_KAS: ${cat.name}`;
          if (
            (tx.type === 'expense' && (tx.category === keluarPrefix || tx.category === cat.name || tx.category === `IURAN: ${cat.name}`)) ||
            (tx.type === 'income' && tx.category === transferPrefix)
          ) {
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

    // For admin, populate from registered residents
    // For resident, DO NOT pre-populate other residents' names!
    if (!isResident) {
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
    }

    // Populate from dues records (which is already filtered for resident)
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

  // Filter & paginate dues list client-side with search & category filter
  const filteredDues = React.useMemo(() => {
    return duesList.filter((d) => {
      if (duesStatusFilter !== 'all' && d.status !== duesStatusFilter) return false;
      if (duesCategoryFilter !== 'all' && d.fee_category_id !== duesCategoryFilter) return false;
      if (duesSearch.trim()) {
        const query = duesSearch.toLowerCase();
        const residentName = (d.resident_name || '').toLowerCase();
        const catName = (d.fee_category_name || '').toLowerCase();
        if (!residentName.includes(query) && !catName.includes(query)) return false;
      }
      return true;
    });
  }, [duesList, duesStatusFilter, duesCategoryFilter, duesSearch]);

  // Filter pengeluaran dan penyaluran yang bersumber dari pos iuran warga
  const duesDisbursementList = React.useMemo(() => {
    return txList.filter((tx) => {
      const isDirectExpense = tx.type === 'expense' && catList.some((c) => tx.category === `IURAN_KELUAR: ${c.name}` || tx.category === c.name || tx.category === `IURAN: ${c.name}`);
      const isFundTransfer = tx.type === 'income' && catList.some((c) => tx.category === `IURAN_PINDAH_KAS: ${c.name}`);
      return isDirectExpense || isFundTransfer;
    });
  }, [txList, catList]);

  const filteredDisbursements = React.useMemo(() => {
    return duesDisbursementList.filter((tx) => {
      if (duesCategoryFilter !== 'all') {
        const targetCat = catList.find((c) => c.id === duesCategoryFilter);
        if (targetCat) {
          const matchDirect = tx.category === `IURAN_KELUAR: ${targetCat.name}` || tx.category === targetCat.name || tx.category === `IURAN: ${targetCat.name}`;
          const matchTransfer = tx.category === `IURAN_PINDAH_KAS: ${targetCat.name}`;
          if (!matchDirect && !matchTransfer) return false;
        }
      }
      if (duesSearch.trim()) {
        const query = duesSearch.toLowerCase();
        const cat = (tx.category || '').toLowerCase();
        const desc = (tx.description || '').toLowerCase();
        const fundName = (tx.fund_name || '').toLowerCase();
        if (!cat.includes(query) && !desc.includes(query) && !fundName.includes(query)) return false;
      }
      return true;
    });
  }, [duesDisbursementList, duesCategoryFilter, duesSearch, catList]);

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
      if (editingCategory) {
        await updateFeeCat.mutateAsync({
          id: editingCategory.id,
          name: catName,
          amount: catAmount,
          period: catPeriod,
          description: catDesc || undefined,
          pic_user_id: catPicUserId || null,
        });
        showFeedback('success', 'Kategori iuran berhasil diperbarui.');
      } else {
        await createFeeCat.mutateAsync({
          name: catName,
          amount: catAmount,
          period: catPeriod,
          description: catDesc || undefined,
          pic_user_id: catPicUserId || null,
        });
        showFeedback('success', 'Kategori iuran berhasil ditambahkan.');
      }
      setIsCatModalOpen(false);
      setEditingCategory(null);
      setCatName('');
      setCatAmount(0);
      setCatPeriod('monthly');
      setCatDesc('');
      setCatPicUserId('');
    } catch (err: any) {
      showFeedback('error', err?.response?.data?.error || 'Gagal menyimpan kategori iuran.');
    }
  };

  const handleEditCategory = (cat: any) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatAmount(cat.amount);
    setCatPeriod(cat.period);
    setCatDesc(cat.description || '');
    setCatPicUserId(cat.pic_user_id || '');
    setIsCatModalOpen(true);
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
      if (editingFund) {
        await updateFund.mutateAsync({
          id: editingFund.id,
          name: fundName,
          type: fundType,
          description: fundDesc || undefined,
          pic_user_id: fundPicUserId || null,
        });
        showFeedback('success', 'Kantong kas berhasil diperbarui.');
      } else {
        await createFund.mutateAsync({
          name: fundName,
          type: fundType,
          description: fundDesc || undefined,
          pic_user_id: fundPicUserId || null,
        });
        showFeedback('success', 'Kantong kas berhasil ditambahkan.');
      }
      setIsFundModalOpen(false);
      setEditingFund(null);
      setFundName('');
      setFundType('operational');
      setFundDesc('');
      setFundPicUserId('');
    } catch (err: any) {
      showFeedback('error', err?.response?.data?.error || 'Gagal menyimpan kantong kas.');
    }
  };

  const handleEditFund = (fund: any) => {
    setEditingFund(fund);
    setFundName(fund.name);
    setFundType(fund.type);
    setFundDesc(fund.description || '');
    setFundPicUserId(fund.pic_user_id || '');
    setIsFundModalOpen(true);
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

      {/* Header & Quick Action */}
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
                className="h-9 gap-1.5 font-medium text-xs apple-btn-primary"
              >
                <Coins className="h-3.5 w-3.5" />
                Transaksi Iuran Warga
              </Button>
              <Button
                onClick={() => setIsTxModalOpen(true)}
                variant="outline"
                className="h-9 gap-1.5 font-medium text-xs text-[#0066cc] border-[#d2d2d7] hover:bg-[#f4f8fb]"
              >
                <Plus className="h-3.5 w-3.5" />
                Transaksi Kas RT
              </Button>
              {/* <Button
                onClick={() => setIsFundModalOpen(true)}
                variant="outline"
                className="h-9 gap-1.5 font-medium text-xs text-[#1d1d1f] border-[#d2d2d7] hover:bg-[#f5f5f7]"
              >
                <Wallet className="h-3.5 w-3.5 text-[#707070]" />
                Kantong Kas Baru
              </Button> */}
            </>
          )}
          {/* Tombol Reset hanya muncul di lingkungan dev/staging dan bukan warga, dilarang keras di production */}
          {(() => {
            if (isResident || typeof window === 'undefined') return false;
            const h = window.location.hostname.toLowerCase();
            const isProd = h === 'iscube.web.id' || (/^[a-z0-9-]+\.iscube\.web\.id$/.test(h) && !h.includes('-dev') && !h.includes('-staging'));
            return !isProd;
          })() ? (
            <Button
              onClick={async () => {
                if (window.confirm('Apakah Anda yakin ingin mengosongkan seluruh data iuran dan transaksi kas untuk testing? Tindakan ini tidak dapat dibatalkan.')) {
                  try {
                    await resetFinancialData.mutateAsync();
                    showFeedback('success', 'Seluruh data transaksi dan iuran berhasil direset ke Rp 0.');
                  } catch (err: any) {
                    showFeedback('error', err?.response?.data?.error || 'Gagal mereset data keuangan.');
                  }
                }
              }}
              variant="ghost"
              disabled={resetFinancialData.isPending}
              className="h-9 px-2.5 text-xs text-[#858585] hover:text-rose-600 hover:bg-white"
              title="Reset data transaksi & iuran (Testing only)"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-[#d2d2d7] shadow-xs">
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

        <Card className="p-4 border-[#d2d2d7] shadow-xs">
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

        <Card className="p-4 border-[#d2d2d7] shadow-xs">
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

      {/* Tabs Navigasi 3 Pilar Utama (Scrollable on Mobile) */}
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
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors ${
                activeTab === 'master'
                  ? 'border-[#0071e3] text-[#0066cc] font-semibold'
                  : 'border-transparent text-[#707070] hover:text-[#1d1d1f]'
              }`}
            >
              3. Pengaturan Pos &amp; Kantong Kas ({fundList.length + catList.length})
            </button>
          )}
        </nav>
      </div>

      {/* Tab Content: Dues (Iuran Warga) */}
      {activeTab === 'dues' && (
        <div className="space-y-4">
          {/* Ringkasan Saldo per Pos Iuran Warga */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {catList.map((c: any) => {
              const b = duesCategoryBalances[c.id] || { collected: 0, spent: 0, balance: 0, verifiedCount: 0, pendingCount: 0 };
              return (
                <Card
                  key={c.id}
                  onClick={() => {
                    setDuesCategoryFilter(duesCategoryFilter === c.id ? 'all' : c.id);
                    setDuesPage(1);
                  }}
                  className={`p-3 cursor-pointer transition-all flex flex-col justify-between gap-1.5 border-[#d2d2d7] ${
                    duesCategoryFilter === c.id
                      ? 'border-[#0071e3] ring-1 ring-[#0071e3] bg-[#f4f8fb]'
                      : 'hover:border-[#0071e3]'
                  }`}
                  title="Klik untuk filter iuran pos ini"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-[#1d1d1f] truncate">{c.name}</span>
                      <span className="text-[10px] text-[#707070] shrink-0 font-medium">
                        {c.period === 'monthly' ? 'Bulanan' : 'Insidental'}
                      </span>
                    </div>
                    <div className="mt-1 text-base font-bold text-[#1d1d1f] tabular-nums">
                      Rp {b.balance.toLocaleString('id-ID')}
                    </div>
                    <div className="text-[10px] text-[#707070] truncate mt-0.5">
                      Masuk: Rp {b.collected.toLocaleString('id-ID')}
                    </div>
                  </div>

                  {!isResident && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDisburseCatId(c.id);
                        setIsDisburseModalOpen(true);
                      }}
                      className="mt-1 text-left text-[11px] text-[#0071e3] hover:underline font-semibold"
                    >
                      Salurkan Dana &rarr;
                    </button>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Sub-view Toggle: Per Warga vs Riwayat Iuran Masuk vs Riwayat Pengeluaran Iuran */}
          <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 p-3 bg-white border border-[#d2d2d7] rounded-xl shadow-xs">
            <div className="flex items-center overflow-x-auto scrollbar-none pb-1 lg:pb-0">
              <div className="inline-flex rounded-lg border border-[#d2d2d7] bg-[#f5f5f7] p-1 text-xs font-semibold whitespace-nowrap">
                <button
                  onClick={() => setDuesViewMode('resident')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                    duesViewMode === 'resident'
                      ? 'bg-white text-[#0066cc] shadow-xs'
                      : 'text-[#707070] hover:text-[#1d1d1f]'
                  }`}
                >
                  <Users className="h-3.5 w-3.5" /> Buku Iuran ({residentDuesSummary.length})
                </button>
                <button
                  onClick={() => setDuesViewMode('history')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                    duesViewMode === 'history'
                      ? 'bg-white text-[#0066cc] shadow-xs'
                      : 'text-[#707070] hover:text-[#1d1d1f]'
                  }`}
                >
                  <ArrowDownRight className="h-3.5 w-3.5 text-emerald-600" /> Iuran Masuk ({duesList.length})
                </button>
                {!isResident && (
                  <button
                    onClick={() => setDuesViewMode('disbursements')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                      duesViewMode === 'disbursements'
                        ? 'bg-white text-[#0066cc] shadow-xs'
                        : 'text-[#707070] hover:text-[#1d1d1f]'
                    }`}
                  >
                    <ArrowUpRight className="h-3.5 w-3.5 text-rose-600" /> Pengeluaran / Penyaluran ({duesDisbursementList.length})
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
              {/* Filter Kategori Pos Iuran */}
              <div className="w-full sm:w-44">
                <Select
                  value={duesCategoryFilter}
                  onChange={(e) => {
                    setDuesCategoryFilter(e.target.value);
                    setDuesPage(1);
                  }}
                  className="text-xs h-9 bg-white border-[#d2d2d7]"
                >
                  <option value="all">Semua Pos Iuran</option>
                  {catList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>

              {duesViewMode === 'history' && (
                <div className="w-full sm:w-36">
                  <Select
                    value={duesStatusFilter}
                    onChange={(e) => {
                      setDuesStatusFilter(e.target.value as any);
                      setDuesPage(1);
                    }}
                    aria-label="Filter Status Verifikasi Iuran"
                    className="text-xs h-9 bg-white border-[#d2d2d7]"
                  >
                    <option value="all">Semua Status</option>
                    <option value="pending">Menunggu Verifikasi</option>
                    <option value="verified">Lunas / Terverifikasi</option>
                    <option value="rejected">Ditolak</option>
                  </Select>
                </div>
              )}
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#858585]" />
                <Input
                  type="text"
                  placeholder={duesViewMode === 'resident' ? 'Cari nama warga...' : 'Cari keterangan / pos...'}
                  value={duesSearch}
                  onChange={(e) => {
                    setDuesSearch(e.target.value);
                    setDuesPage(1);
                  }}
                  className="pl-8 text-xs h-9 bg-white border-[#d2d2d7]"
                />
              </div>
            </div>
          </div>

          {/* View 1: Buku Iuran per Warga (Matriks Apa Saja yang Sudah Dibayar) */}
          {duesViewMode === 'resident' && (
            <div className="rounded-xl border border-[#d2d2d7] bg-white shadow-xs overflow-hidden">
              <div className="p-4 border-b border-[#d2d2d7] bg-[#f5f5f7] flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-sm text-[#1d1d1f]">Rekapitulasi Iuran Setiap Warga</h3>
                  <p className="text-xs text-[#707070]">
                    Melihat pos iuran apa saja yang sudah lunas dan status pembayaran masing-masing warga
                  </p>
                </div>
              </div>

              {isDuesLoading || isResidentsLoading ? (
                <div className="p-6 text-center text-[#707070]">Memuat rekapitulasi iuran warga...</div>
              ) : residentDuesSummary.length === 0 ? (
                <div className="p-6 text-center text-[#707070]">
                  {duesSearch ? 'Tidak ada data warga yang cocok dengan pencarian.' : 'Belum ada data warga terdaftar.'}
                </div>
              ) : (
                <div className="divide-y divide-[#e2e2e5]">
                  {residentDuesSummary.map((res) => {
                    const catEntries = Object.values(res.categories);
                    return (
                      <div key={res.resident_id} className="p-4 hover:bg-[#f5f5f7]/60 transition-colors">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-[#1d1d1f]">{res.resident_name}</span>
                              {res.pending_count > 0 && (
                                <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px]">
                                  {res.pending_count} Perlu Verifikasi
                                </Badge>
                              )}
                              {res.verified_count > 0 && (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
                                  {res.verified_count} Transaksi Lunas
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-[#707070]">
                              Total Disetor: <strong className="text-[#1d1d1f] tabular-nums">Rp {res.total_paid.toLocaleString('id-ID')}</strong> ({res.items.length} catatan pembayaran)
                            </p>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedResidentId(res.resident_id)}
                            className="text-xs h-8 gap-1.5 self-start sm:self-auto text-[#0066cc] border-[#d2d2d7] hover:bg-[#f4f8fb]"
                          >
                            Rincian Pembayaran <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        {/* Badges of paid categories */}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {catEntries.length === 0 ? (
                            <span className="text-[11px] text-[#858585] italic">Belum ada riwayat pembayaran iuran</span>
                          ) : (
                            catEntries.map((c) => (
                              <div
                                key={c.category_name}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#f5f5f7] border border-[#d2d2d7] text-xs"
                              >
                                <span className="font-semibold text-[#1d1d1f]">{c.category_name}:</span>
                                <span className="text-emerald-700 font-bold tabular-nums">
                                  Rp {c.total.toLocaleString('id-ID')}
                                </span>
                                <span className="text-[10px] text-[#707070]">
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
            <div className="rounded-xl border border-[#d2d2d7] bg-white shadow-xs overflow-hidden">
              {isDuesLoading ? (
                <div className="p-6 text-center text-[#707070]">Memuat data iuran...</div>
              ) : filteredDues.length === 0 ? (
                <div className="p-6 text-center text-[#707070]">
                  {duesSearch || duesStatusFilter !== 'all'
                    ? 'Tidak ada data iuran yang cocok dengan filter.'
                    : 'Belum ada riwayat iuran warga'}
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Warga</TableHead>
                        <TableHead>Kategori / Periode</TableHead>
                        <TableHead>Jumlah</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Bukti</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedDues.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-semibold text-[#1d1d1f]">
                            {item.resident_name || item.resident_id}
                          </TableCell>
                          <TableCell className="text-[#707070]">
                            {item.fee_category_name || 'Iuran'} ({item.period_month}/{item.period_year})
                          </TableCell>
                          <TableCell className="font-semibold text-[#1d1d1f] tabular-nums">
                            Rp {item.amount.toLocaleString('id-ID')}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-[10px] uppercase font-semibold ${
                                item.status === 'verified'
                                  ? 'bg-[#f4f8fb] text-[#0066cc] border-[#d2d2d7]'
                                  : item.status === 'rejected'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}
                            >
                              {item.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {item.proof_url ? (
                              <a
                                href={getFileUrl(item.proof_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#0066cc] underline hover:text-[#0071e3]"
                              >
                                Lihat Bukti
                              </a>
                            ) : (
                              <span className="text-[#858585]">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            {item.status === 'pending' && !isResident && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleVerify(item.id, 'verified')}
                                  className="text-xs h-7 px-2.5 text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                                >
                                  Verifikasi
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleVerify(item.id, 'rejected')}
                                  className="text-xs h-7 px-2.5 text-rose-600 hover:bg-rose-50 border-rose-200"
                                >
                                  Tolak
                                </Button>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                {/* Pagination */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-[#d2d2d7] bg-[#f5f5f7]">
                    <span className="text-xs text-[#707070] text-center sm:text-left">
                      Menampilkan {paginatedDues.length} dari {filteredDues.length} iuran
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={duesPage <= 1}
                        onClick={() => setDuesPage((p) => p - 1)}
                        className="text-xs border-[#d2d2d7]"
                      >
                        Sebelumnya
                      </Button>
                      <span className="text-xs font-semibold text-[#1d1d1f] px-2 tabular-nums">
                        {duesPage} / {totalDuesPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={duesPage >= totalDuesPages}
                        onClick={() => setDuesPage((p) => p + 1)}
                        className="text-xs border-[#d2d2d7]"
                      >
                        Selanjutnya
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* View 3: Riwayat Pengeluaran & Penyaluran Iuran */}
          {duesViewMode === 'disbursements' && (
            <div className="rounded-xl border border-[#d2d2d7] bg-white shadow-xs overflow-hidden">
              <div className="p-4 border-b border-[#d2d2d7] bg-[#f5f5f7] flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-rose-950 flex items-center gap-2">
                    <ArrowUpRight className="h-4 w-4 text-rose-600" /> Riwayat Pengeluaran &amp; Penyaluran Dana Iuran
                  </h3>
                  <p className="text-xs text-[#707070] mt-0.5">
                    Daftar belanja langsung keperluan pos dan pemindahan alokasi ke kantong kas RT
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-[#707070] block">Total Pengeluaran Iuran:</span>
                  <span className="text-sm font-bold text-rose-600 tabular-nums">
                    Rp{' '}
                    {filteredDisbursements
                      .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0)
                      .toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {filteredDisbursements.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  {duesSearch || duesCategoryFilter !== 'all'
                    ? 'Tidak ada riwayat pengeluaran yang cocok dengan filter.'
                    : 'Belum ada pengeluaran atau penyaluran dari pos iuran warga.'}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Pos Iuran Sumber</TableHead>
                      <TableHead>Tipe Penyaluran</TableHead>
                      <TableHead>Keterangan / Keperluan</TableHead>
                      <TableHead>Jumlah</TableHead>
                      <TableHead className="text-right">Bukti / Nota</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDisbursements.map((tx: any) => {
                      const isTransfer = tx.category?.startsWith('IURAN_PINDAH_KAS');
                      const catClean = tx.category
                        ?.replace('IURAN_PINDAH_KAS: ', '')
                        ?.replace('IURAN_KELUAR: ', '')
                        ?.replace('IURAN: ', '');

                      return (
                        <TableRow key={tx.id}>
                          <TableCell className="text-xs text-[#707070] font-mono">
                            {new Date(tx.transaction_date).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-[#1d1d1f]">
                            {catClean || '-'}
                          </TableCell>
                          <TableCell className="text-xs">
                            {isTransfer ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#f4f8fb] px-2 py-0.5 text-[10px] font-semibold text-[#0066cc] border border-[#d2d2d7]">
                                <Wallet className="h-3 w-3" /> Pindah ke Kas RT ({tx.fund_name || 'Kas'})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 border border-rose-200">
                                <ArrowUpRight className="h-3 w-3" /> Belanja Langsung
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-[#707070] max-w-xs truncate" title={tx.description}>
                            {tx.description || '-'}
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-rose-600 tabular-nums">
                            - Rp {Number(tx.amount).toLocaleString('id-ID')}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {tx.proof_url ? (
                              <a
                                href={getFileUrl(tx.proof_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#0066cc] underline hover:text-[#0071e3] font-medium"
                              >
                                Lihat Bukti
                              </a>
                            ) : (
                              <span className="text-[#858585]">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Transactions (Buku Kas RT) */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          {/* Ringkasan Saldo per Kantong Kas RT */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {fundList.map((f: any) => (
              <Card
                key={f.id}
                onClick={() => {
                  setTxFundFilter(txFundFilter === f.id ? 'all' : f.id);
                  setTxPage(1);
                }}
                className={`p-3 cursor-pointer transition-all border-[#d2d2d7] ${
                  txFundFilter === f.id
                    ? 'border-[#0071e3] ring-1 ring-[#0071e3] bg-[#f4f8fb]'
                    : 'hover:border-[#0071e3]'
                }`}
                title="Klik untuk filter transaksi kantong ini"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold text-[#1d1d1f] truncate">{f.name}</span>
                  {f.is_default && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#f4f8fb] text-[#0066cc] border border-[#d2d2d7]">
                      Utama
                    </span>
                  )}
                </div>
                <div className="mt-1 text-base font-bold text-[#1d1d1f] tabular-nums">
                  Rp {(f.balance || 0).toLocaleString('id-ID')}
                </div>
                <div className="text-[10px] text-[#707070] truncate mt-0.5">
                  {f.pic_name ? `PIC: ${f.pic_name}` : 'PIC: Pengurus RT'}
                </div>
              </Card>
            ))}
          </div>

          {/* Controls: Filter & Search */}
          <div className="p-3 bg-white border border-[#d2d2d7] rounded-xl shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="inline-flex rounded-lg border border-[#d2d2d7] bg-[#f5f5f7] p-0.5 text-xs font-semibold">
                <button
                  onClick={() => {
                    setTxTypeFilter('all');
                    setTxPage(1);
                  }}
                  className={`px-3 py-1 rounded-md transition-all ${
                    txTypeFilter === 'all' ? 'bg-white text-[#0066cc] shadow-xs' : 'text-[#707070] hover:text-[#1d1d1f]'
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
                    txTypeFilter === 'income' ? 'bg-white text-emerald-700 shadow-xs' : 'text-[#707070] hover:text-[#1d1d1f]'
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
                    txTypeFilter === 'expense' ? 'bg-white text-rose-700 shadow-xs' : 'text-[#707070] hover:text-[#1d1d1f]'
                  }`}
                >
                  Pengeluaran
                </button>
              </div>

              {fundList.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="txFundFilter" className="text-xs text-[#707070] whitespace-nowrap">
                    Kantong:
                  </Label>
                  <Select
                    id="txFundFilter"
                    value={txFundFilter}
                    onChange={(e) => {
                      setTxFundFilter(e.target.value);
                      setTxPage(1);
                    }}
                    className="text-xs h-8 py-0 bg-white border-[#d2d2d7]"
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
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#858585]" />
              <Input
                type="text"
                placeholder="Cari kategori / deskripsi..."
                value={txSearch}
                onChange={(e) => {
                  setTxSearch(e.target.value);
                  setTxPage(1);
                }}
                className="pl-8 text-xs h-9 bg-white border-[#d2d2d7]"
              />
            </div>
          </div>

          <div className="rounded-xl border border-[#d2d2d7] bg-white shadow-xs overflow-hidden">
            {isTxLoading ? (
              <div className="p-6 text-center text-[#707070]">Memuat data transaksi...</div>
            ) : filteredTransactions.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                {txSearch || txTypeFilter !== 'all' || txFundFilter !== 'all'
                  ? 'Tidak ada transaksi yang cocok dengan filter.'
                  : 'Belum ada transaksi kas'}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead>Kantong Kas</TableHead>
                      <TableHead>Kategori / Ket.</TableHead>
                      <TableHead>Jumlah</TableHead>
                      <TableHead>Bukti</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTx.map((tx: any) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-[#707070] font-mono text-xs">
                          {tx.transaction_date}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase border ${
                              tx.type === 'income' ? 'bg-[#f4f8fb] text-[#0066cc] border-[#d2d2d7]' : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {tx.type === 'income' ? 'Masuk' : 'Keluar'}
                          </span>
                        </TableCell>
                        <TableCell className="text-[#1d1d1f] font-medium text-xs">
                          {tx.fund_name || 'Kas RT'}
                        </TableCell>
                        <TableCell className="text-xs text-[#707070]">
                          <div className="font-semibold text-[#1d1d1f]">{tx.category}</div>
                          {tx.description && (
                            <div className="text-[11px] text-[#707070]">{tx.description}</div>
                          )}
                        </TableCell>
                        <TableCell className={`text-xs font-semibold tabular-nums ${tx.type === 'income' ? 'text-[#0066cc]' : 'text-rose-600'}`}>
                          {tx.type === 'income' ? '+' : '-'} Rp {tx.amount.toLocaleString('id-ID')}
                        </TableCell>
                        <TableCell>
                          {tx.proof_url ? (
                            <a
                              href={getFileUrl(tx.proof_url)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#0066cc] underline hover:text-[#0071e3] text-xs font-medium"
                            >
                              Lihat Bukti
                            </a>
                          ) : (
                            <span className="text-[#858585] text-xs">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

              {/* Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-[#d2d2d7] bg-[#f5f5f7]">
                  <span className="text-xs text-[#707070] text-center sm:text-left">
                    Menampilkan {paginatedTx.length} dari {filteredTransactions.length} transaksi
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={txPage <= 1}
                      onClick={() => setTxPage((p) => p - 1)}
                      className="text-xs border-[#d2d2d7]"
                    >
                      Sebelumnya
                    </Button>
                    <span className="text-xs font-semibold text-[#1d1d1f] px-2 tabular-nums">
                      {txPage} / {totalTxPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={txPage >= totalTxPages}
                      onClick={() => setTxPage((p) => p + 1)}
                      className="text-xs border-[#d2d2d7]"
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

      {/* Tab Content: Master Pos & Kantong Kas (Terpadu: Kantong Kas + Kategori Iuran + Kategori Kas) */}
      {activeTab === 'master' && (
        <div className="space-y-6">
          {/* Bagian 1: Master Kantong Kas RT (Multi-Fund) */}
          <div className="rounded-xl border border-[#d2d2d7] bg-white shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#d2d2d7] flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-[#f5f5f7]">
              <div>
                <h3 className="font-semibold text-sm text-[#1d1d1f] flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-[#0071e3]" /> Master Kantong Kas RT (Multi-Fund)
                </h3>
                <p className="text-xs text-[#707070]">Pemisahan likuiditas kas operasional, sosial, kepemudaan, atau pembangunan</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsCashCatModalOpen(true)}
                  className="gap-1.5 text-xs text-[#1d1d1f] border-[#d2d2d7] hover:bg-white"
                >
                  Kategori Kas Masuk &amp; Keluar ({cashCats.length})
                </Button>
                <Button size="sm" onClick={() => setIsFundModalOpen(true)} className="gap-1.5 apple-btn-primary">
                  <Plus className="h-4 w-4" /> Tambah Kantong Kas
                </Button>
              </div>
            </div>
            {isFundsLoading ? (
              <div className="p-6 text-center text-[#707070]">Memuat data kantong kas...</div>
            ) : fundList.length === 0 ? (
              <div className="p-6 text-center text-[#707070]">Belum ada kantong kas</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Kantong Kas</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>PIC / Penanggung Jawab</TableHead>
                    <TableHead>Saldo Saat Ini</TableHead>
                    <TableHead>Deskripsi / Peruntukan</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fundList.map((f: any) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-semibold text-[#1d1d1f]">
                        {f.name} {f.is_default && <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-[#f4f8fb] text-[#0066cc] border border-[#d2d2d7] font-semibold">Utama</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] uppercase font-semibold border bg-[#f5f5f7] text-[#707070] border-[#d2d2d7]">
                          {f.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {f.pic_name ? (
                          <div className="text-xs">
                            <div className="font-medium text-[#1d1d1f]">{f.pic_name}</div>
                            <div className="text-[10px] text-[#707070]">{f.pic_email}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-[#858585] italic">Pengurus RT Utama</span>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold text-[#1d1d1f] tabular-nums">
                        Rp {(f.balance || 0).toLocaleString('id-ID')}
                      </TableCell>
                      <TableCell className="text-xs text-[#707070]">{f.description || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditFund(f)}
                            className="text-[#707070] hover:text-[#1d1d1f]"
                            title="Edit Kantong Kas & PIC"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          {!f.is_default && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteFund(f.id, f.is_default)}
                              className="text-rose-600 hover:text-rose-800"
                              title="Hapus Kantong Kas"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Bagian 2: Master Kategori & Tarif Pos Iuran Warga */}
          <div className="rounded-xl border border-[#d2d2d7] bg-white shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#d2d2d7] flex justify-between items-center bg-[#f5f5f7]">
              <div>
                <h3 className="font-semibold text-sm text-[#1d1d1f] flex items-center gap-2">
                  <Coins className="w-4 h-4 text-[#0071e3]" /> Master Kategori &amp; Tarif Pos Iuran Warga ({catList.length})
                </h3>
                <p className="text-xs text-[#707070]">
                  Pos iuran kewajiban warga (misal: Iuran Sampah, Keamanan, Kas Lingkungan)
                </p>
              </div>
              <Button size="sm" onClick={() => setIsCatModalOpen(true)} className="gap-1.5 apple-btn-primary">
                <Plus className="h-4 w-4" /> Tambah Jenis Iuran
              </Button>
            </div>
            {isCatsLoading ? (
              <div className="p-6 text-center text-[#707070]">Memuat master kategori iuran...</div>
            ) : catList.length === 0 ? (
              <div className="p-6 text-center text-[#707070]">Belum ada jenis iuran. Silakan tambahkan baru.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Iuran</TableHead>
                    <TableHead>PIC / Penanggung Jawab</TableHead>
                    <TableHead>Tarif / Nominal</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead>Keterangan</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {catList.map((cat: any) => (
                    <TableRow key={cat.id}>
                      <TableCell className="font-semibold text-[#1d1d1f]">{cat.name}</TableCell>
                      <TableCell>
                        {cat.pic_name ? (
                          <div className="text-xs">
                            <div className="font-medium text-[#1d1d1f]">{cat.pic_name}</div>
                            <div className="text-[10px] text-[#707070]">{cat.pic_email}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-[#858585] italic">Pengurus RT Utama</span>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold text-[#1d1d1f] tabular-nums">Rp {Number(cat.amount).toLocaleString('id-ID')}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-semibold uppercase border bg-[#f5f5f7] text-[#707070] border-[#d2d2d7]">
                          {cat.period === 'monthly' ? 'Bulanan' : 'Sekali Bayar (Insidental)'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-[#707070]">{cat.description || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditCategory(cat)}
                            className="text-[#707070] hover:text-[#1d1d1f]"
                            title="Edit Kategori & PIC"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="text-rose-600 hover:text-rose-800"
                            title="Hapus Kategori"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      )}

      {/* Modal Master Kategori Kas Masuk & Keluar */}
      <SimpleDialog
        isOpen={isCashCatModalOpen}
        onClose={() => {
          setIsCashCatModalOpen(false);
          setEditingCashCat(null);
          setNewCashCatName('');
          setNewCashCatDesc('');
          setNewCashCatType('income');
        }}
        title="Master Kategori Kas Masuk & Keluar"
        description="Kelola pos kategori untuk transaksi pemasukan dan pengeluaran kas buku besar RT"
        className="max-w-4xl"
      >
        <div className="space-y-6">
          {/* Form Tambah / Edit Kategori Kas (Dipindahkan ke Atas) */}
          <div className="rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] p-4">
            <div className="mb-3 flex justify-between items-center">
              <h4 className="font-semibold text-xs text-[#1d1d1f]">
                {editingCashCat ? `Edit Kategori: ${editingCashCat.name}` : 'Tambah Kategori Kas Baru'}
              </h4>
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
                  className="text-xs h-7"
                >
                  Batal Edit
                </Button>
              )}
            </div>
            <form onSubmit={handleSaveCashCategory} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="newCashCatName" className="text-xs font-medium text-[#1d1d1f]">Nama Kategori *</Label>
                  <Input
                    id="newCashCatName"
                    placeholder="Contoh: BANTUAN_DUKA"
                    value={newCashCatName}
                    onChange={(e) => setNewCashCatName(e.target.value)}
                    className="text-xs h-9 bg-white"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="newCashCatType" className="text-xs font-medium text-[#1d1d1f]">Tipe Kas *</Label>
                  <Select
                    id="newCashCatType"
                    value={newCashCatType}
                    onChange={(e) => setNewCashCatType(e.target.value as any)}
                    className="text-xs h-9 bg-white"
                  >
                    <option value="income">Pemasukan (Income)</option>
                    <option value="expense">Pengeluaran (Expense)</option>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="newCashCatDesc" className="text-xs font-medium text-[#1d1d1f]">Keterangan (Opsional)</Label>
                  <Input
                    id="newCashCatDesc"
                    placeholder="Catatan peruntukan pos kas"
                    value={newCashCatDesc}
                    onChange={(e) => setNewCashCatDesc(e.target.value)}
                    className="text-xs h-9 bg-white"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <Button type="submit" size="sm" className="gap-1.5 px-4 h-8 text-xs font-medium apple-btn-primary">
                  {editingCashCat ? (
                    <>
                      <Edit2 className="h-3.5 w-3.5" /> Simpan Perubahan
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" /> Simpan Kategori
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Daftar Kategori Pemasukan & Pengeluaran */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Kategori Pemasukan */}
            <div className="rounded-xl border border-[#d2d2d7] bg-white p-4 shadow-xs space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-[#d2d2d7]">
                <h4 className="font-semibold text-sm text-emerald-800 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Kategori Kas Masuk (Income)
                </h4>
                <span className="text-xs text-[#707070] font-mono">
                  {cashCats.filter((c) => c.type === 'income').length} kategori
                </span>
              </div>
              <ul className="divide-y divide-[#e2e2e5] text-xs text-[#1d1d1f] max-h-56 overflow-y-auto">
                {cashCats.filter((c) => c.type === 'income').length === 0 ? (
                  <li className="py-4 text-center text-[#858585] italic">Belum ada kategori pemasukan.</li>
                ) : (
                  cashCats.filter((c) => c.type === 'income').map((c) => (
                    <li key={c.id} className="py-2 flex justify-between items-center hover:bg-[#f5f5f7] px-1.5 rounded transition">
                      <div>
                        <span className="font-semibold text-[#1d1d1f]">{c.name}</span>
                        {c.desc && <p className="text-[10px] text-[#707070] font-normal">{c.desc}</p>}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditCashCat(c)}
                          className="text-[#0066cc] hover:text-[#0071e3] h-7 w-7 p-0"
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
            <div className="rounded-xl border border-[#d2d2d7] bg-white p-4 shadow-xs space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-[#d2d2d7]">
                <h4 className="font-semibold text-sm text-rose-800 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-500"></span> Kategori Kas Keluar (Expense)
                </h4>
                <span className="text-xs text-[#707070] font-mono">
                  {cashCats.filter((c) => c.type === 'expense').length} kategori
                </span>
              </div>
              <ul className="divide-y divide-[#e2e2e5] text-xs text-[#1d1d1f] max-h-56 overflow-y-auto">
                {cashCats.filter((c) => c.type === 'expense').length === 0 ? (
                  <li className="py-4 text-center text-[#858585] italic">Belum ada kategori pengeluaran.</li>
                ) : (
                  cashCats.filter((c) => c.type === 'expense').map((c) => (
                    <li key={c.id} className="py-2 flex justify-between items-center hover:bg-[#f5f5f7] px-1.5 rounded transition">
                      <div>
                        <span className="font-semibold text-[#1d1d1f]">{c.name}</span>
                        {c.desc && <p className="text-[10px] text-[#707070] font-normal">{c.desc}</p>}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditCashCat(c)}
                          className="text-[#0066cc] hover:text-[#0071e3] h-7 w-7 p-0"
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
        </div>
      </SimpleDialog>

      {/* Modals */}
      <DuesPaymentModal isOpen={isDuesModalOpen} onClose={() => setIsDuesModalOpen(false)} />
      <TransactionModal isOpen={isTxModalOpen} onClose={() => setIsTxModalOpen(false)} />

      {/* Master Fee Category Modal */}
      <SimpleDialog
        isOpen={isCatModalOpen}
        onClose={() => {
          setIsCatModalOpen(false);
          setEditingCategory(null);
          setCatName('');
          setCatAmount(0);
          setCatPeriod('monthly');
          setCatDesc('');
          setCatPicUserId('');
        }}
        title={editingCategory ? 'Edit Jenis / Kategori Iuran' : 'Tambah Jenis / Kategori Iuran'}
        className="max-w-3xl"
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
            <Label htmlFor="catPic">Penanggung Jawab (PIC Pos Iuran)</Label>
            <Select
              id="catPic"
              value={catPicUserId}
              onChange={(e) => setCatPicUserId(e.target.value)}
            >
              <option value="">-- Pengurus RT Utama (Default) --</option>
              {userList.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email}) - {u.role_name || u.role}
                </option>
              ))}
            </Select>
            <p className="text-[11px] text-[#707070]">
              PIC yang ditunjuk memiliki wewenang mencatat dan memverifikasi setoran iuran warga pada pos ini.
            </p>
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
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCatModalOpen(false);
                setEditingCategory(null);
                setCatName('');
                setCatAmount(0);
                setCatPeriod('monthly');
                setCatDesc('');
                setCatPicUserId('');
              }}
            >
              Batal
            </Button>
            <Button type="submit">{editingCategory ? 'Simpan Perubahan' : 'Simpan Kategori'}</Button>
          </div>
        </form>
      </SimpleDialog>

      {/* Master Kantong Kas (Fund) Modal */}
      <SimpleDialog
        isOpen={isFundModalOpen}
        onClose={() => {
          setIsFundModalOpen(false);
          setEditingFund(null);
          setFundName('');
          setFundType('operational');
          setFundDesc('');
          setFundPicUserId('');
        }}
        title={editingFund ? 'Edit Kantong Kas' : 'Tambah Kantong Kas Baru'}
        className="max-w-3xl"
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
            <Label htmlFor="fundPic">Penanggung Jawab (PIC Kantong Kas)</Label>
            <Select
              id="fundPic"
              value={fundPicUserId}
              onChange={(e) => setFundPicUserId(e.target.value)}
            >
              <option value="">-- Pengurus RT Utama (Default) --</option>
              {userList.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email}) - {u.role_name || u.role}
                </option>
              ))}
            </Select>
            <p className="text-[11px] text-[#707070]">
              PIC yang ditunjuk memiliki wewenang mencatat transaksi mutasi pemasukan/pengeluaran pada kantong kas ini.
            </p>
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
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsFundModalOpen(false);
                setEditingFund(null);
                setFundName('');
                setFundType('operational');
                setFundDesc('');
                setFundPicUserId('');
              }}
            >
              Batal
            </Button>
            <Button type="submit">{editingFund ? 'Simpan Perubahan' : 'Simpan Kantong Kas'}</Button>
          </div>
        </form>
      </SimpleDialog>

      {/* Modal Detail Rincian Iuran Per Warga */}
      <SimpleDialog
        isOpen={!!selectedResidentId}
        onClose={() => {
          setSelectedResidentId(null);
          setModalDuesPage(1);
          setModalDuesYearFilter('all');
          setModalDuesCategoryFilter('all');
        }}
        title={`Buku Iuran: ${residentDuesSummary.find((r) => r.resident_id === selectedResidentId)?.resident_name || 'Warga'}`}
        className="max-w-3xl sm:max-w-4xl"
      >
        {(() => {
          const res = residentDuesSummary.find((r) => r.resident_id === selectedResidentId);
          if (!res) return null;

          // Ekstrak list tahun unik dari item transaksi warga
          const availableYears = Array.from(
            new Set(res.items.map((i: any) => String(i.period_year || new Date(i.created_at).getFullYear())))
          ).sort((a, b) => Number(b) - Number(a));

          // Filter item transaksi di modal
          const filteredItems = res.items.filter((item: any) => {
            const itemYear = String(item.period_year || new Date(item.created_at).getFullYear());
            if (modalDuesYearFilter !== 'all' && itemYear !== modalDuesYearFilter) return false;
            if (modalDuesCategoryFilter !== 'all' && item.fee_category_id !== modalDuesCategoryFilter) return false;
            return true;
          });

          const totalModalPages = Math.ceil(filteredItems.length / MODAL_PAGE_SIZE) || 1;
          const paginatedItems = filteredItems.slice(
            (modalDuesPage - 1) * MODAL_PAGE_SIZE,
            modalDuesPage * MODAL_PAGE_SIZE
          );

          return (
            <div className="space-y-4 text-xs">
              {/* Ringkasan Akumulasi */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <span className="text-[11px] font-medium text-slate-500">Total Telah Lunas Disetor:</span>
                  <div className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
                    Rp {res.total_paid.toLocaleString('id-ID')}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                    {res.verified_count} Lunas
                  </span>
                  {res.pending_count > 0 && (
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-100 text-amber-800">
                      {res.pending_count} Menunggu Verifikasi
                    </span>
                  )}
                </div>
              </div>

              {/* Pos Iuran Summary Badges */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-slate-700">
                  <span className="font-semibold text-xs">Akumulasi per Pos Iuran:</span>
                  <span className="text-[10px] text-slate-400">{Object.keys(res.categories).length} Pos Terbayar</span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {Object.values(res.categories).length === 0 ? (
                    <span className="text-slate-400 italic">Belum ada riwayat pembayaran</span>
                  ) : (
                    Object.values(res.categories).map((c) => (
                      <div
                        key={c.category_name}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-slate-200 bg-white text-[11px]"
                      >
                        <span className="text-slate-600 font-medium">{c.category_name}:</span>
                        <strong className="text-emerald-700">Rp {c.total.toLocaleString('id-ID')}</strong>
                        <span className="text-[10px] text-slate-400">({c.count}x)</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Filter Bar Riwayat Transaksi */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 mb-2">
                  <span className="font-semibold text-xs text-slate-800">
                    Daftar Pembayaran ({filteredItems.length})
                  </span>
                  <div className="flex items-center gap-2">
                    {availableYears.length > 1 && (
                      <div className="w-32">
                        <Select
                          value={modalDuesYearFilter}
                          onValueChange={(val) => {
                            setModalDuesYearFilter(val);
                            setModalDuesPage(1);
                          }}
                        >
                          <option value="all">Semua Tahun</option>
                          {availableYears.map((y) => (
                            <option key={y} value={y}>Tahun {y}</option>
                          ))}
                        </Select>
                      </div>
                    )}

                    {catList.length > 1 && (
                      <div className="w-36">
                        <Select
                          value={modalDuesCategoryFilter}
                          onValueChange={(val) => {
                            setModalDuesCategoryFilter(val);
                            setModalDuesPage(1);
                          }}
                        >
                          <option value="all">Semua Pos</option>
                          {catList.map((cat: any) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </Select>
                      </div>
                    )}
                  </div>
                </div>

                {/* List Item Transaksi dengan Scroll & Pagination */}
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white overflow-hidden">
                  {filteredItems.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 italic">
                      Tidak ada transaksi pembayaran yang cocok.
                    </div>
                  ) : (
                    paginatedItems.map((item: any) => (
                      <div key={item.id} className="p-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-800 truncate">
                              {item.fee_category_name || 'Iuran'}
                            </span>
                            <span className="text-[10px] text-slate-400 whitespace-nowrap">
                              ({item.period_month ? `${item.period_month}/` : ''}{item.period_year || '-'})
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                item.status === 'verified'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : item.status === 'rejected'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {item.status === 'verified' ? 'Lunas' : item.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                            </span>
                            {item.proof_url && (
                              <a
                                href={getFileUrl(item.proof_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#0066cc] hover:text-[#0071e3] underline text-[10px] font-medium"
                              >
                                Lihat Bukti
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="text-right whitespace-nowrap">
                          <span className="font-bold text-slate-900 text-xs">
                            Rp {Number(item.amount).toLocaleString('id-ID')}
                          </span>
                          {item.status === 'pending' && !isResident && (
                            <div className="flex gap-2 justify-end mt-1">
                              <button
                                onClick={() => handleVerify(item.id, 'verified')}
                                className="text-emerald-700 hover:text-emerald-900 font-bold text-[10px]"
                              >
                                Verifikasi
                              </button>
                              <button
                                onClick={() => handleVerify(item.id, 'rejected')}
                                className="text-rose-600 hover:text-rose-800 font-bold text-[10px]"
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

                {/* Modal Pagination Footer */}
                {totalModalPages > 1 && (
                  <div className="flex items-center justify-between pt-2.5 px-1">
                    <span className="text-[11px] text-slate-400">
                      Hal {modalDuesPage} dari {totalModalPages} ({filteredItems.length} data)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={modalDuesPage <= 1}
                        onClick={() => setModalDuesPage((p) => Math.max(1, p - 1))}
                        className="h-6 px-2 text-[10px]"
                      >
                        Sebelumnya
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={modalDuesPage >= totalModalPages}
                        onClick={() => setModalDuesPage((p) => Math.min(totalModalPages, p + 1))}
                        className="h-6 px-2 text-[10px]"
                      >
                        Selanjutnya
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedResidentId(null);
                    setModalDuesPage(1);
                    setModalDuesYearFilter('all');
                    setModalDuesCategoryFilter('all');
                  }}
                  className="h-8 px-4 text-xs font-medium"
                >
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
