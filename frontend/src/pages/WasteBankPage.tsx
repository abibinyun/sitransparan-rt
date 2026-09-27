import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  wasteBankService, 
  WasteDeposit, 
  WasteCategory, 
  WasteBankSummary, 
  HouseholdAccumulation 
} from '../services/wasteBank';
import { 
  Recycle, 
  Plus, 
  Search, 
  Scale, 
  Wallet, 
  Coins, 
  Sparkles,
  Flame,
} from 'lucide-react';
import { PageHeaderTabs } from '../components/ui/PageHeaderTabs';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { formatRupiah } from '../services/public_transparency';
import { useAuthStore } from '../store/useAuthStore';

// Modular Components
import { WasteDepositsTab } from '../components/waste-bank/WasteDepositsTab';
import { WasteHouseholdsTab } from '../components/waste-bank/WasteHouseholdsTab';
import { WasteCategoriesTab } from '../components/waste-bank/WasteCategoriesTab';
import { WasteDepositModal } from '../components/waste-bank/WasteDepositModal';
import { WasteCategoryModal } from '../components/waste-bank/WasteCategoryModal';
import { HouseholdSavingsModal } from '../components/waste-bank/HouseholdSavingsModal';

export const WasteBankPage: React.FC = () => {
  const { user } = useAuthStore();
  const isResident = String(user?.role || '').toLowerCase() === 'resident';
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'deposits' | 'households' | 'categories'>('deposits');
  const [search, setSearch] = useState('');
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<WasteCategory | null>(null);
  const [selectedHouseholdForModal, setSelectedHouseholdForModal] = useState<HouseholdAccumulation | null>(null);

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

  const createDepositMutation = useMutation({
    mutationFn: (data: any) => wasteBankService.createDeposit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wasteDeposits'] });
      queryClient.invalidateQueries({ queryKey: ['wasteBankSummary'] });
      queryClient.invalidateQueries({ queryKey: ['wasteHouseholds'] });
      setIsDepositModalOpen(false);
    },
  });

  const saveCategoryMutation = useMutation({
    mutationFn: (data: any) => {
      if (editingCategory) {
        return wasteBankService.updateCategory(editingCategory.id, data);
      }
      return wasteBankService.createCategory(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wasteCategories'] });
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
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
              <Button
                onClick={() => {
                  setEditingCategory(null);
                  setIsCategoryModalOpen(true);
                }}
                className="gap-2 apple-btn-primary"
              >
                <Plus className="w-4 h-4" />
                Tambah Kategori
              </Button>
            ) : (
              <Button
                onClick={() => setIsDepositModalOpen(true)}
                className="gap-2 apple-btn-primary"
              >
                <Plus className="w-4 h-4" />
                Catat Setoran Warga
              </Button>
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
              Master Kategori &amp; Harga
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
              className="pl-9 bg-white"
            />
          </div>
        )}
      </div>

      {/* Tab 1: Deposits */}
      {activeTab === 'deposits' && (
        <WasteDepositsTab
          depositsList={depositsList}
          isDepositsLoading={isDepositsLoading}
          isResident={isResident}
          onVerifyDeposit={(id) => updateStatusMutation.mutate({ id, status: 'verified' })}
          onPayoutDeposit={(id) => updateStatusMutation.mutate({ id, status: 'paid_out' })}
        />
      )}

      {/* Tab 2: Households Savings */}
      {activeTab === 'households' && (
        <WasteHouseholdsTab
          householdsList={householdsList}
          isHouseholdsLoading={isHouseholdsLoading}
          isResident={isResident}
          onSelectHousehold={setSelectedHouseholdForModal}
        />
      )}

      {/* Tab 3: Categories & Prices */}
      {activeTab === 'categories' && (
        <WasteCategoriesTab
          categories={categoriesList}
          isCategoriesLoading={isCategoriesLoading}
          onEditCategory={(c) => {
            setEditingCategory(c);
            setIsCategoryModalOpen(true);
          }}
          onDeleteCategory={(id, name) => {
            if (window.confirm(`Hapus kategori "${name}"?`)) {
              deleteCategoryMutation.mutate(id);
            }
          }}
        />
      )}

      {/* Modal Catat Setoran Baru */}
      {isDepositModalOpen && (
        <WasteDepositModal
          isOpen={isDepositModalOpen}
          onClose={() => setIsDepositModalOpen(false)}
          categories={categoriesList}
          onSubmit={async (data) => {
            createDepositMutation.mutate(data);
          }}
          isSubmitting={createDepositMutation.isPending}
        />
      )}

      {/* Modal Kategori Sampah */}
      {isCategoryModalOpen && (
        <WasteCategoryModal
          isOpen={isCategoryModalOpen}
          onClose={() => {
            setIsCategoryModalOpen(false);
            setEditingCategory(null);
          }}
          initialData={editingCategory}
          onSubmit={async (data) => {
            saveCategoryMutation.mutate(data);
          }}
          isSubmitting={saveCategoryMutation.isPending}
        />
      )}

      {/* Modal Buku Tabungan KK */}
      {selectedHouseholdForModal && (
        <HouseholdSavingsModal
          isOpen={Boolean(selectedHouseholdForModal)}
          onClose={() => setSelectedHouseholdForModal(null)}
          household={selectedHouseholdForModal}
        />
      )}
    </div>
  );
};

export default WasteBankPage;
