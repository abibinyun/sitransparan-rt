import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  wasteBankService, 
  WasteDeposit, 
  WasteCategory, 
  WasteBankSummary, 
  HouseholdAccumulation 
} from '../services/wasteBank';
import { useResidents } from '../services/resident';
import { SearchableResidentSelect } from '../components/ui/SearchableResidentSelect';
import { useHouses } from '../services/house';
import { 
  Recycle, 
  Plus, 
  Search, 
  Scale, 
  Wallet, 
  Coins, 
  Sparkles,
  Edit2,
  Trash2,
  UserCheck,
  Home,
  Flame,
} from 'lucide-react';
import { PageHeaderTabs } from '../components/ui/PageHeaderTabs';
import { Select } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { Dialog } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/table';
import { formatRupiah } from '../services/public_transparency';
import { useAuthStore } from '../store/useAuthStore';

export const WasteBankPage: React.FC = () => {
  const { user } = useAuthStore();
  const isResident = String(user?.role || '').toLowerCase() === 'resident';
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'deposits' | 'households' | 'categories'>('deposits');
  const [search, setSearch] = useState('');
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<WasteCategory | null>(null);

  // Queries
  const { data: summary } = useQuery<WasteBankSummary>({
    queryKey: ['wasteBankSummary'],
    queryFn: () => wasteBankService.getSummary(),
  });

  const { data: depositsData, isLoading: isDepositsLoading } = useQuery({
    queryKey: ['wasteDeposits', search],
    queryFn: () => wasteBankService.getDeposits({ search, limit: 50 }),
  });

  const { data: householdsData, isLoading: isHouseholdsLoading } = useQuery({
    queryKey: ['wasteHouseholds'],
    queryFn: () => wasteBankService.getHouseholdAccumulations(1, 50),
    enabled: activeTab === 'households',
  });

  const { data: categories, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['wasteCategories'],
    queryFn: () => wasteBankService.getCategories(false),
  });

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      wasteBankService.updateDepositStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wasteDeposits'] });
      queryClient.invalidateQueries({ queryKey: ['wasteBankSummary'] });
      queryClient.invalidateQueries({ queryKey: ['wasteHouseholds'] });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => wasteBankService.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wasteCategories'] });
    },
  });

  const rawDepositsList = depositsData?.data || [];
  const rawHouseholdsList = householdsData?.data || [];
  const categoriesList = categories || [];

  const depositsList = isResident
    ? rawDepositsList.filter((d: WasteDeposit) => {
        const matchesUser = user?.id && (d as any).user_id === user.id;
        const matchesHouse = user?.house_id && (d as any).house_id === user.house_id;
        const matchesName = user?.name && d.family_head_name?.toLowerCase().includes(user.name.toLowerCase());
        return matchesUser || matchesHouse || matchesName;
      })
    : rawDepositsList;

  const householdsList = isResident
    ? rawHouseholdsList.filter((h: HouseholdAccumulation) => {
        const matchesHouse = user?.house_id && (h as any).house_id === user.house_id;
        const matchesName = user?.name && h.family_head_name?.toLowerCase().includes(user.name.toLowerCase());
        return matchesHouse || matchesName;
      })
    : rawHouseholdsList;

  const empowermentTabs = [
    { to: '/admin/karang-taruna', label: 'Karang Taruna & Pemuda', icon: Flame },
    { to: '/admin/waste-bank', label: 'Bank Sampah Digital', icon: Recycle },
  ];

  return (
    <div className="space-y-6">
      <PageHeaderTabs
        title="Unit Pemberdayaan & Inisiatif Lingkungan"
        description="Kelola organisasi kepemudaan Karang Taruna dan program ekonomi sirkular Bank Sampah warga."
        tabs={empowermentTabs}
        actions={
          !isResident ? (
            activeTab === 'categories' ? (
              <button
                onClick={() => {
                  setEditingCategory(null);
                  setIsCategoryModalOpen(true);
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition shadow-sm shadow-emerald-200"
              >
                <Plus className="w-4 h-4" />
                Tambah Kategori
              </button>
            ) : (
              <button
                onClick={() => setIsDepositModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition shadow-sm shadow-emerald-200"
              >
                <Plus className="w-4 h-4" />
                Catat Setoran Warga
              </button>
            )
          ) : undefined
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Total Sampah Terkumpul</p>
            <p className="text-xl font-bold text-slate-800">
              {summary ? (summary.total_weight_kg || 0).toLocaleString('id-ID') : 0} <span className="text-sm font-medium text-slate-500">kg</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Total Nilai Bruto</p>
            <p className="text-xl font-bold text-slate-800">
              {formatRupiah(summary?.total_gross_value || 0)}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Hak Hasil Warga</p>
            <p className="text-xl font-bold text-amber-600">
              {formatRupiah(summary?.total_resident_earnings || 0)}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Kas Karang Taruna</p>
            <p className="text-xl font-bold text-purple-600">
              {formatRupiah(summary?.total_karang_taruna_share || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('deposits')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
              activeTab === 'deposits' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Riwayat Setoran
          </button>
          <button
            onClick={() => setActiveTab('households')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
              activeTab === 'households' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {isResident ? 'Tabungan Saya' : 'Buku Tabungan KK'}
          </button>
          {!isResident && (
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                activeTab === 'categories' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Master Kategori & Harga
            </button>
          )}
        </div>

        {activeTab === 'deposits' && (
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#858585] absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Cari nama KK / no KK..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        )}
      </div>

      {/* Content Area */}
      {activeTab === 'deposits' && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Kepala Keluarga / KK</TableHead>
              <TableHead>Bobot (kg)</TableHead>
              <TableHead>Total Bruto</TableHead>
              <TableHead>Bagian Warga</TableHead>
              <TableHead>Kas Pemuda</TableHead>
              <TableHead>Status</TableHead>
              {!isResident && <TableHead className="text-right">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isDepositsLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-[#707070]">Memuat data setoran...</TableCell>
              </TableRow>
            ) : depositsList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-[#707070]">Belum ada catatan setoran sampah</TableCell>
              </TableRow>
            ) : (
              depositsList.map((d: WasteDeposit) => (
                <TableRow key={d.id}>
                  <TableCell className="text-[#707070] whitespace-nowrap font-mono text-xs">
                    {d.deposit_date ? new Date(d.deposit_date).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    }) : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-[#1d1d1f]">{d.family_head_name}</div>
                    <div className="text-[11px] text-[#707070] font-mono">KK: {d.kk_number} {d.rt_number ? `· RT ${d.rt_number}` : ''}</div>
                  </TableCell>
                  <TableCell className="font-semibold text-[#1d1d1f]">
                    {d.total_weight_kg} kg
                  </TableCell>
                  <TableCell className="text-[#1d1d1f] tabular-nums">
                    {formatRupiah(d.total_gross_amount || 0)}
                  </TableCell>
                  <TableCell className="font-semibold text-[#0066cc] tabular-nums">
                    {formatRupiah(d.resident_earnings_amount || 0)}
                  </TableCell>
                  <TableCell className="font-semibold text-[#1d1d1f] tabular-nums">
                    {formatRupiah(d.karang_taruna_amount || 0)}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                      d.status === 'verified'
                        ? 'bg-[#f4f8fb] text-[#0066cc] border-[#d2d2d7]'
                        : d.status === 'paid_out'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      {d.status === 'verified' ? 'Terverifikasi' : d.status === 'paid_out' ? 'Sudah Cair' : 'Menunggu'}
                    </span>
                  </TableCell>
                  {!isResident && (
                    <TableCell className="text-right">
                      {d.status === 'pending' && (
                        <button
                          onClick={() => updateStatusMutation.mutate({ id: d.id, status: 'verified' })}
                          className="apple-btn-primary text-xs px-2.5 py-1"
                        >
                          Verifikasi
                        </button>
                      )}
                      {d.status === 'verified' && (
                        <button
                          onClick={() => updateStatusMutation.mutate({ id: d.id, status: 'paid_out' })}
                          className="apple-btn-secondary text-xs px-2.5 py-1"
                        >
                          Tandai Cair
                        </button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      {activeTab === 'households' && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kepala Keluarga</TableHead>
              <TableHead>Nomor KK</TableHead>
              <TableHead>Alamat / RT</TableHead>
              <TableHead>Frekuensi Setor</TableHead>
              <TableHead>Akumulasi Bobot</TableHead>
              <TableHead>Total Saldo Hasil</TableHead>
              <TableHead>Setoran Terakhir</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isHouseholdsLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-[#707070]">Memuat rekapitulasi KK...</TableCell>
              </TableRow>
            ) : householdsList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-[#707070]">Belum ada KK terdaftar yang menyetor</TableCell>
              </TableRow>
            ) : (
              householdsList.map((h: HouseholdAccumulation, idx: number) => (
                <TableRow key={idx}>
                  <TableCell className="font-semibold text-[#1d1d1f]">
                    {h.family_head_name}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-[#707070]">
                    {h.kk_number}
                  </TableCell>
                  <TableCell className="text-[#707070]">
                    RT {h.rt_number || '-'} {h.house_number ? `/ No. ${h.house_number}` : ''}
                  </TableCell>
                  <TableCell className="text-[#1d1d1f]">
                    {h.deposit_count} kali
                  </TableCell>
                  <TableCell className="font-semibold text-[#1d1d1f]">
                    {h.total_weight_kg} kg
                  </TableCell>
                  <TableCell className="font-semibold text-[#0066cc] tabular-nums">
                    {formatRupiah(h.total_earnings_amount || 0)}
                  </TableCell>
                  <TableCell className="text-[#707070] text-xs font-mono whitespace-nowrap">
                    {h.last_deposit_date ? new Date(h.last_deposit_date).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    }) : '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isCategoriesLoading ? (
            <div className="col-span-full py-8 text-center text-slate-400">Memuat master kategori sampah...</div>
          ) : categoriesList.length === 0 ? (
            <div className="col-span-full py-8 text-center text-slate-400">Belum ada kategori sampah yang ditambahkan</div>
          ) : (
            categoriesList.map((cat: WasteCategory) => (
              <div key={cat.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:border-slate-200 transition">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-slate-800">{cat.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Satuan: {cat.unit}</p>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold text-sm rounded-lg whitespace-nowrap">
                      {formatRupiah(cat.price_per_unit || 0)} / {cat.unit}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl">
                    <div>
                      <p className="text-[11px] text-[#707070] font-medium">Bagi Hasil Warga</p>
                      <p className="text-sm font-bold text-amber-600">{cat.resident_share_pct}%</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[#707070] font-medium">Kas Karang Taruna</p>
                      <p className="text-sm font-bold text-[#0066cc]">{cat.karang_taruna_share_pct}%</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#d2d2d7] flex items-center justify-between">
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${cat.is_active ? 'bg-[#f4f8fb] text-[#0066cc] border-[#d2d2d7]' : 'bg-gray-50 text-[#707070] border-[#d2d2d7]'}`}>
                    {cat.is_active ? 'Aktif' : 'Non-aktif'}
                  </span>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingCategory(cat);
                        setIsCategoryModalOpen(true);
                      }}
                      className="p-1.5 text-[#707070] hover:text-[#0066cc] hover:bg-[#f5f5f7] rounded-lg transition"
                      title="Edit Kategori"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Hapus kategori "${cat.name}"?`)) {
                          deleteCategoryMutation.mutate(cat.id);
                        }
                      }}
                      className="p-1.5 text-[#707070] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Hapus Kategori"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal Catat Setoran Terintegrasi Data Penduduk */}
      {isDepositModalOpen && (
        <DepositModal
          categories={categoriesList}
          onClose={() => setIsDepositModalOpen(false)}
          onSuccess={() => {
            setIsDepositModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['wasteDeposits'] });
            queryClient.invalidateQueries({ queryKey: ['wasteBankSummary'] });
            queryClient.invalidateQueries({ queryKey: ['wasteHouseholds'] });
          }}
        />
      )}

      {/* Modal Master Kategori */}
      {isCategoryModalOpen && (
        <CategoryModal
          initialData={editingCategory}
          onClose={() => {
            setIsCategoryModalOpen(false);
            setEditingCategory(null);
          }}
          onSuccess={() => {
            setIsCategoryModalOpen(false);
            setEditingCategory(null);
            queryClient.invalidateQueries({ queryKey: ['wasteCategories'] });
          }}
        />
      )}
    </div>
  );
};

// Sub-component: Modal Catat Setoran Terhubung ke Master Penduduk Warga & Rumah
const DepositModal: React.FC<{
  categories: WasteCategory[];
  onClose: () => void;
  onSuccess: () => void;
}> = ({ categories, onClose, onSuccess }) => {
  const [familyHeadName, setFamilyHeadName] = useState('');
  const [kkNumber, setKkNumber] = useState('');
  const [rtNumber, setRtNumber] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [selectedResidentId, setSelectedResidentId] = useState('');
  const [selectedHouseId, setSelectedHouseId] = useState('');
  const [items, setItems] = useState<{ category_id: string; quantity: number }[]>([
    { category_id: categories[0]?.id || '', quantity: 1 }
  ]);

  // Load master data residents & houses
  const { data: residentsData } = useResidents({
    limit: 100,
  });
  const { data: housesData, isLoading: isHousesLoading } = useHouses({
    limit: 100,
  });

  const residentsList = residentsData?.data || [];
  const housesList = housesData?.data || [];

  const handleSelectHouse = (houseId: string) => {
    setSelectedHouseId(houseId);
    if (!houseId) return;
    const foundHouse = housesList.find(h => h.id === houseId);
    if (foundHouse) {
      setHouseNumber(foundHouse.block_number);
      if (foundHouse.head_resident) {
        setSelectedResidentId(foundHouse.head_resident.id);
        setFamilyHeadName(foundHouse.head_resident.full_name || '');
        setKkNumber(foundHouse.head_resident.kk_number || '');
        if (foundHouse.head_resident.rt_rw) {
          const parts = foundHouse.head_resident.rt_rw.split('/');
          setRtNumber(parts[0]?.replace(/\D/g, '') || '');
        }
      }
    }
  };

  const handleSelectResident = (residentId: string) => {
    setSelectedResidentId(residentId);
    if (!residentId) {
      return;
    }
    const found = residentsList.find(r => r.id === residentId);
    if (found) {
      setFamilyHeadName(found.full_name || '');
      setKkNumber(found.kk_number || '');
      // Format RT/RW or address parsing
      if (found.rt_rw) {
        const parts = found.rt_rw.split('/');
        setRtNumber(parts[0]?.replace(/\D/g, '') || '');
      }
      if (!houseNumber) {
        setHouseNumber(found.address || '');
      }
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => wasteBankService.createDeposit(data),
    onSuccess,
  });

  const addItem = () => {
    if (categories.length > 0) {
      setItems([...items, { category_id: categories[0].id, quantity: 1 }]);
    }
  };

  const updateItem = (index: number, field: string, val: any) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: val };
    setItems(next);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      family_head_name: familyHeadName,
      kk_number: kkNumber,
      rt_number: rtNumber,
      house_number: houseNumber,
      items: items.map(i => ({ category_id: i.category_id, quantity: Number(i.quantity) })),
    });
  };

  return (
    <Dialog
      isOpen={true}
      onClose={onClose}
      title="Catat Setoran Bank Sampah"
      description="Input berat dan jenis sampah terpilah warga"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
          {/* Integrasi Pilihan Rumah (Stiker QR) */}
          <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-2">
            <label className="block text-xs font-bold text-emerald-900 flex items-center gap-1.5">
              <Home className="w-4 h-4 text-emerald-600" />
              Pilih dari Data Rumah / Stiker QR (Otomatis Isi)
            </label>
            <Select
              value={selectedHouseId}
              onValueChange={(val) => handleSelectHouse(val)}
            >
              <option value="">-- Pilih Rumah / Blok Warga --</option>
              {isHousesLoading ? (
                <option disabled value="">Memuat master rumah...</option>
              ) : (
                housesList.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.block_number} {h.head_resident ? `- KK: ${h.head_resident.full_name}` : ''} {h.address ? `(${h.address})` : ''}
                  </option>
                ))
              )}
            </Select>
          </div>

          {/* Integrasi Master Data Warga */}
          <div className="p-3 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl space-y-2">
            <label className="block text-xs font-semibold text-[#1d1d1f] flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              Pilih dari Master Data Penduduk (Opsional)
            </label>
            <SearchableResidentSelect
              value={selectedResidentId}
              onChange={(val) => handleSelectResident(val)}
              residents={residentsList}
              placeholder="Cari warga terdaftar (otomatis mengisi data KK & RT/RW)..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Kepala Keluarga (KK)</label>
              <Input
                type="text"
                required
                placeholder="cth: Bambang Supriyanto"
                value={familyHeadName}
                onChange={e => setFamilyHeadName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Nomor KK (16 Digit)</label>
              <Input
                type="text"
                required
                placeholder="3201..."
                value={kkNumber}
                onChange={e => setKkNumber(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">RT</label>
              <Input
                type="text"
                placeholder="003"
                value={rtNumber}
                onChange={e => setRtNumber(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Alamat / Nomor Rumah</label>
              <Input
                type="text"
                placeholder="Blok B4 No. 12"
                value={houseNumber}
                onChange={e => setHouseNumber(e.target.value)}
              />
            </div>
          </div>

          {/* Items */}
          <div className="pt-3 border-t border-[#d2d2d7]">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-[#1d1d1f]">Rincian Kategori Sampah</label>
              <button
                type="button"
                onClick={addItem}
                className="text-xs font-semibold text-[#0066cc] hover:text-[#0071e3] flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Baris
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select
                      value={item.category_id}
                      onValueChange={(val) => updateItem(idx, 'category_id', val)}
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({formatRupiah(c.price_per_unit || 0)}/{c.unit})
                        </option>
                      ))}
                    </Select>
                  </div>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={item.quantity}
                    onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                    className="w-24 text-right"
                    placeholder="Qty"
                  />
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="p-2 text-[#858585] hover:text-rose-600 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#d2d2d7]">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Menyimpan...' : 'Simpan Setoran'}
            </Button>
          </div>
        </form>
    </Dialog>
  );
};

// Sub-component: Modal Tambah/Edit Master Kategori Sampah
const CategoryModal: React.FC<{
  initialData?: WasteCategory | null;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ initialData, onClose, onSuccess }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [unit, setUnit] = useState(initialData?.unit || 'kg');
  const [pricePerUnit, setPricePerUnit] = useState<number>(initialData?.price_per_unit || 3000);
  const [residentSharePct, setResidentSharePct] = useState<number>(initialData?.resident_share_pct || 80);
  const [karangTarunaSharePct, setKarangTarunaSharePct] = useState<number>(initialData?.karang_taruna_share_pct || 20);
  const [isActive, setIsActive] = useState<boolean>(initialData ? initialData.is_active : true);

  const isEditing = Boolean(initialData?.id);

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (isEditing && initialData) {
        return wasteBankService.updateCategory(initialData.id, data);
      }
      return wasteBankService.createCategory(data);
    },
    onSuccess,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      name,
      unit,
      price_per_unit: Number(pricePerUnit),
      resident_share_pct: Number(residentSharePct),
      karang_taruna_share_pct: Number(karangTarunaSharePct),
      is_active: isActive,
    });
  };

  return (
    <Dialog
      isOpen={true}
      onClose={onClose}
      title={isEditing ? 'Ubah Kategori Sampah' : 'Tambah Kategori Sampah'}
      description="Atur harga per unit dan persentase bagi hasil"
    >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Nama Kategori</label>
            <Input
              type="text"
              required
              placeholder="cth: Kardus / Box Bekas"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Satuan</label>
              <Input
                type="text"
                required
                placeholder="kg / liter / pcs"
                value={unit}
                onChange={e => setUnit(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Harga per Satuan (Rp)</label>
              <Input
                type="number"
                required
                min="0"
                value={pricePerUnit}
                onChange={e => setPricePerUnit(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Bagi Hasil Warga (%)</label>
              <Input
                type="number"
                required
                min="0"
                max="100"
                value={residentSharePct}
                onChange={e => {
                  const val = Math.min(100, Math.max(0, Number(e.target.value)));
                  setResidentSharePct(val);
                  setKarangTarunaSharePct(100 - val);
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Bagian Karang Taruna (%)</label>
              <Input
                type="number"
                required
                min="0"
                max="100"
                value={karangTarunaSharePct}
                onChange={e => {
                  const val = Math.min(100, Math.max(0, Number(e.target.value)));
                  setKarangTarunaSharePct(val);
                  setResidentSharePct(100 - val);
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Checkbox
              id="category_is_active"
              checked={isActive}
              onCheckedChange={(checked) => setIsActive(Boolean(checked))}
            />
            <label htmlFor="category_is_active" className="text-xs text-[#1d1d1f] font-medium cursor-pointer select-none">
              Status Kategori Aktif (Dapat dipilih saat penimbangan)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#d2d2d7]">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Kategori'}
            </Button>
          </div>
        </form>
    </Dialog>
  );
};

export default WasteBankPage;
