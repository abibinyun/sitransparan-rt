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
} from 'lucide-react';
import { formatRupiah } from '../services/public_transparency';

export const WasteBankPage: React.FC = () => {
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

  const depositsList = depositsData?.data || [];
  const householdsList = householdsData?.data || [];
  const categoriesList = categories || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Recycle className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold text-slate-800">Bank Sampah Digital</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Program setoran pilah sampah per KK, bagi hasil saldo warga & kas operasional Karang Taruna
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {activeTab === 'categories' ? (
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
          )}
        </div>
      </div>

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
            Buku Tabungan KK
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
              activeTab === 'categories' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Master Kategori & Harga
          </button>
        </div>

        {activeTab === 'deposits' && (
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama KK / no KK..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 w-full sm:w-64"
            />
          </div>
        )}
      </div>

      {/* Content Area */}
      {activeTab === 'deposits' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-xs font-semibold text-slate-500">
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Kepala Keluarga / KK</th>
                  <th className="py-3 px-4">Bobot (kg)</th>
                  <th className="py-3 px-4">Total Bruto</th>
                  <th className="py-3 px-4">Bagian Warga</th>
                  <th className="py-3 px-4">Kas Pemuda</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isDepositsLoading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">Memuat data setoran...</td>
                  </tr>
                ) : depositsList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">Belum ada catatan setoran sampah</td>
                  </tr>
                ) : (
                  depositsList.map((d: WasteDeposit) => (
                    <tr key={d.id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {d.deposit_date ? new Date(d.deposit_date).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        }) : '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">{d.family_head_name}</div>
                        <div className="text-xs text-slate-400 font-mono">KK: {d.kk_number} {d.rt_number ? `• RT ${d.rt_number}` : ''}</div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {d.total_weight_kg} kg
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        {formatRupiah(d.total_gross_amount || 0)}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-amber-600">
                        {formatRupiah(d.resident_earnings_amount || 0)}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-purple-600">
                        {formatRupiah(d.karang_taruna_amount || 0)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          d.status === 'verified'
                            ? 'bg-blue-50 text-blue-700'
                            : d.status === 'paid_out'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {d.status === 'verified' ? 'Terverifikasi' : d.status === 'paid_out' ? 'Sudah Cair' : 'Menunggu'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {d.status === 'pending' && (
                          <button
                            onClick={() => updateStatusMutation.mutate({ id: d.id, status: 'verified' })}
                            className="px-2.5 py-1 text-xs font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition"
                          >
                            Verifikasi
                          </button>
                        )}
                        {d.status === 'verified' && (
                          <button
                            onClick={() => updateStatusMutation.mutate({ id: d.id, status: 'paid_out' })}
                            className="px-2.5 py-1 text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition"
                          >
                            Tandai Cair
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'households' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-xs font-semibold text-slate-500">
                  <th className="py-3 px-4">Kepala Keluarga</th>
                  <th className="py-3 px-4">Nomor KK</th>
                  <th className="py-3 px-4">Alamat / RT</th>
                  <th className="py-3 px-4">Frekuensi Setor</th>
                  <th className="py-3 px-4">Akumulasi Bobot</th>
                  <th className="py-3 px-4">Total Saldo Hasil</th>
                  <th className="py-3 px-4">Setoran Terakhir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isHouseholdsLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">Memuat rekapitulasi KK...</td>
                  </tr>
                ) : householdsList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">Belum ada KK terdaftar yang menyetor</td>
                  </tr>
                ) : (
                  householdsList.map((h: HouseholdAccumulation, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {h.family_head_name}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-500">
                        {h.kk_number}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        RT {h.rt_number || '-'} {h.house_number ? `/ No. ${h.house_number}` : ''}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        {h.deposit_count} kali
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {h.total_weight_kg} kg
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-600">
                        {formatRupiah(h.total_earnings_amount || 0)}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                        {h.last_deposit_date ? new Date(h.last_deposit_date).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        }) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
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
                      <p className="text-[11px] text-slate-400 font-medium">Bagi Hasil Warga</p>
                      <p className="text-sm font-bold text-amber-600">{cat.resident_share_pct}%</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-medium">Kas Karang Taruna</p>
                      <p className="text-sm font-bold text-purple-600">{cat.karang_taruna_share_pct}%</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${cat.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {cat.is_active ? 'Aktif' : 'Non-aktif'}
                  </span>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingCategory(cat);
                        setIsCategoryModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
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
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
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

// Sub-component: Modal Catat Setoran Terhubung ke Master Penduduk Warga
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
  const [items, setItems] = useState<{ category_id: string; quantity: number }[]>([
    { category_id: categories[0]?.id || '', quantity: 1 }
  ]);

  // Load master data residents
  const { data: residentsData, isLoading: isResidentsLoading } = useResidents({
    limit: 100,
  });

  const residentsList = residentsData?.data || [];

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
      setHouseNumber(found.address || '');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Catat Setoran Bank Sampah</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Integrasi Master Data Warga */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-xl space-y-2">
            <label className="block text-xs font-bold text-emerald-800 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              Pilih dari Master Data Penduduk (Opsional / Otomatis)
            </label>
            <select
              value={selectedResidentId}
              onChange={(e) => handleSelectResident(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">-- Isi Manual atau Pilih Warga Terdaftar --</option>
              {isResidentsLoading ? (
                <option disabled>Memuat master warga...</option>
              ) : (
                residentsList.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.full_name} {r.kk_number ? `(KK: ${r.kk_number})` : ''} {r.rt_rw ? `- RT/RW ${r.rt_rw}` : ''}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Kepala Keluarga (KK)</label>
              <input
                type="text"
                required
                placeholder="cth: Bambang Supriyanto"
                value={familyHeadName}
                onChange={e => setFamilyHeadName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nomor KK (16 Digit)</label>
              <input
                type="text"
                required
                placeholder="3201..."
                value={kkNumber}
                onChange={e => setKkNumber(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">RT</label>
              <input
                type="text"
                placeholder="003"
                value={rtNumber}
                onChange={e => setRtNumber(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Alamat / Nomor Rumah</label>
              <input
                type="text"
                placeholder="Blok B4 No. 12"
                value={houseNumber}
                onChange={e => setHouseNumber(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          {/* Items */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700">Rincian Kategori Sampah</label>
              <button
                type="button"
                onClick={addItem}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Baris
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={item.category_id}
                    onChange={e => updateItem(idx, 'category_id', e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({formatRupiah(c.price_per_unit || 0)}/{c.unit})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={item.quantity}
                    onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                    className="w-24 px-3 py-2 text-sm border border-slate-200 rounded-xl text-right"
                    placeholder="Qty"
                  />
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="p-2 text-slate-400 hover:text-rose-600 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm shadow-emerald-200"
            >
              {createMutation.isPending ? 'Menyimpan...' : 'Simpan Setoran'}
            </button>
          </div>
        </form>
      </div>
    </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
        <h2 className="text-lg font-bold text-slate-800 mb-4">
          {isEditing ? 'Ubah Kategori Sampah' : 'Tambah Kategori Sampah'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Kategori</label>
            <input
              type="text"
              required
              placeholder="cth: Kardus / Box Bekas"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Satuan</label>
              <input
                type="text"
                required
                placeholder="kg / liter / pcs"
                value={unit}
                onChange={e => setUnit(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Harga per Satuan (Rp)</label>
              <input
                type="number"
                required
                min="0"
                value={pricePerUnit}
                onChange={e => setPricePerUnit(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Bagi Hasil Warga (%)</label>
              <input
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
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Bagian Karang Taruna (%)</label>
              <input
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
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="category_is_active"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded"
            />
            <label htmlFor="category_is_active" className="text-xs text-slate-700 font-medium cursor-pointer">
              Status Kategori Aktif (Dapat dipilih saat penimbangan)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm shadow-emerald-200"
            >
              {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Kategori'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WasteBankPage;
