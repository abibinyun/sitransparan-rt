import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, Plus, RotateCcw } from 'lucide-react';
import { inventoryService, InventoryItem, InventoryBorrowing } from '../services/inventory';
import { useAuthStore } from '../store/useAuthStore';
import { Button } from '../components/ui/button';

// Modular Components
import { InventoryItemsTab } from '../components/inventory/InventoryItemsTab';
import { InventoryBorrowingsTab } from '../components/inventory/InventoryBorrowingsTab';
import { InventoryItemModal } from '../components/inventory/InventoryItemModal';
import { InventoryBorrowModal } from '../components/inventory/InventoryBorrowModal';
import { InventoryReturnModal } from '../components/inventory/InventoryReturnModal';

export const InventoryPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isResident = user?.role === 'resident';

  // Tabs: 'items' or 'borrowings'
  const [activeTab, setActiveTab] = useState<'items' | 'borrowings'>('items');

  // Filter & Search Items
  const [itemSearch, setItemSearch] = useState('');
  const [itemCategory, setItemCategory] = useState('');

  // Filter & Search Borrowings
  const [borrowingStatus, setBorrowingStatus] = useState('');

  // Modal State
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);
  const [targetItemForBorrow, setTargetItemForBorrow] = useState<InventoryItem | null>(null);

  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedBorrowing, setSelectedBorrowing] = useState<InventoryBorrowing | null>(null);
  const [returnCondition, setReturnCondition] = useState('good');
  const [returnNotes, setReturnNotes] = useState('');

  // Form State Barang
  const [itemForm, setItemForm] = useState({
    name: '',
    item_code: '',
    category: 'Peralatan Tenda & Kursi',
    description: '',
    quantity: 1,
    unit: 'Unit',
    condition: 'good',
    location: '',
    source_fund: 'Kas RT',
    is_borrowable: true,
    notes: '',
  });

  // Form State Peminjaman
  const [borrowForm, setBorrowForm] = useState({
    borrower_name: '',
    borrower_phone: '',
    quantity: 1,
    purpose: '',
    borrow_date: new Date().toISOString().split('T')[0],
    expected_return_date: '',
    condition_before: 'good',
    admin_notes: '',
    notes: '',
  });

  // Queries
  const { data: itemsData, isLoading: isItemsLoading } = useQuery({
    queryKey: ['inventory-items', itemCategory, itemSearch],
    queryFn: () =>
      inventoryService.getItems({
        category: itemCategory || undefined,
        search: itemSearch || undefined,
      }),
  });

  const { data: borrowingsData, isLoading: isBorrowingsLoading } = useQuery({
    queryKey: ['inventory-borrowings', borrowingStatus],
    queryFn: () =>
      inventoryService.getBorrowings({
        status: borrowingStatus || undefined,
      }),
  });

  // Mutations
  const createItemMutation = useMutation({
    mutationFn: inventoryService.createItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      setIsItemModalOpen(false);
      resetItemForm();
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<InventoryItem> }) =>
      inventoryService.updateItem(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      setIsItemModalOpen(false);
      setSelectedItem(null);
      resetItemForm();
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: inventoryService.deleteItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
    },
  });

  const createBorrowMutation = useMutation({
    mutationFn: inventoryService.createBorrowing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-borrowings'] });
      setIsBorrowModalOpen(false);
      resetBorrowForm();
    },
  });

  const updateBorrowStatusMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: { status: string; condition_after?: string; admin_notes?: string };
    }) => inventoryService.updateBorrowingStatus(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-borrowings'] });
      setIsReturnModalOpen(false);
      setSelectedBorrowing(null);
    },
  });

  const resetItemForm = () => {
    setItemForm({
      name: '',
      item_code: '',
      category: 'Peralatan Tenda & Kursi',
      description: '',
      quantity: 1,
      unit: 'Unit',
      condition: 'good',
      location: '',
      source_fund: 'Kas RT',
      is_borrowable: true,
      notes: '',
    });
  };

  const resetBorrowForm = () => {
    setBorrowForm({
      borrower_name: '',
      borrower_phone: '',
      quantity: 1,
      purpose: '',
      borrow_date: new Date().toISOString().split('T')[0],
      expected_return_date: '',
      condition_before: 'good',
      admin_notes: '',
      notes: '',
    });
  };

  const handleEditItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setItemForm({
      name: item.name,
      item_code: item.item_code || '',
      category: item.category,
      description: item.description || '',
      quantity: item.quantity,
      unit: item.unit,
      condition: item.condition,
      location: item.location || '',
      source_fund: item.source_fund || '',
      is_borrowable: item.is_borrowable,
      notes: item.notes || '',
    });
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItem) {
      updateItemMutation.mutate({
        id: selectedItem.id,
        payload: itemForm,
      });
    } else {
      createItemMutation.mutate(itemForm);
    }
  };

  const handleOpenBorrow = (item: InventoryItem) => {
    setTargetItemForBorrow(item);
    setBorrowForm((prev) => ({
      ...prev,
      quantity: 1,
    }));
    setIsBorrowModalOpen(true);
  };

  const handleSaveBorrow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetItemForBorrow) return;
    createBorrowMutation.mutate({
      item_id: targetItemForBorrow.id,
      ...borrowForm,
      status: 'approved',
    });
  };

  const handleOpenReturn = (borrowing: InventoryBorrowing) => {
    setSelectedBorrowing(borrowing);
    setReturnCondition(borrowing.condition_before || 'good');
    setReturnNotes('');
    setIsReturnModalOpen(true);
  };

  const handleSaveReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBorrowing) return;
    updateBorrowStatusMutation.mutate({
      id: selectedBorrowing.id,
      payload: {
        status: 'returned',
        condition_after: returnCondition,
        admin_notes: returnNotes || undefined,
      },
    });
  };

  const categories = [
    'Peralatan Tenda & Kursi',
    'Sound & Elektronik',
    'Kebersihan & Kerja Bakti',
    'Olahraga & Kesenian',
    'Perlengkapan Umum',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Package className="w-7 h-7 text-emerald-600" />
            Inventaris &amp; Aset RT
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Pengelolaan aset warga (tenda, kursi, sound system, terpal, alat kerja bakti) &amp; peminjaman.
          </p>
        </div>

        {/* Action Button: Admin Only */}
        {!isResident && (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                setSelectedItem(null);
                resetItemForm();
                setIsItemModalOpen(true);
              }}
              className="gap-2 apple-btn-primary"
            >
              <Plus className="w-4 h-4" />
              Tambah Barang Aset
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('items')}
            className={`pb-4 text-sm font-medium border-b-2 flex items-center gap-2 transition ${
              activeTab === 'items'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Package className="w-4 h-4" />
            Daftar Barang &amp; Stok ({itemsData?.total || 0})
          </button>
          <button
            onClick={() => setActiveTab('borrowings')}
            className={`pb-4 text-sm font-medium border-b-2 flex items-center gap-2 transition ${
              activeTab === 'borrowings'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            Pencatatan Peminjaman ({borrowingsData?.total || 0})
          </button>
        </nav>
      </div>

      {/* Tab 1: Items List & Stock */}
      {activeTab === 'items' && (
        <InventoryItemsTab
          items={itemsData?.data || []}
          isLoadingItems={isItemsLoading}
          search={itemSearch}
          onSearchChange={setItemSearch}
          categoryFilter={itemCategory}
          onCategoryFilterChange={setItemCategory}
          categories={categories}
          isResident={isResident}
          onOpenBorrow={handleOpenBorrow}
          onEditItem={handleEditItem}
          onDeleteItem={(id, name) => {
            if (window.confirm(`Hapus barang "${name}" dari inventaris?`)) {
              deleteItemMutation.mutate(id);
            }
          }}
        />
      )}

      {/* Tab 2: Borrowings Tracking */}
      {activeTab === 'borrowings' && (
        <InventoryBorrowingsTab
          borrowings={borrowingsData?.data || []}
          isLoadingBorrowings={isBorrowingsLoading}
          statusFilter={borrowingStatus}
          onStatusFilterChange={setBorrowingStatus}
          isResident={isResident}
          onOpenReturn={handleOpenReturn}
        />
      )}

      {/* Modal Form Tambah/Edit Barang */}
      <InventoryItemModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        selectedItem={selectedItem}
        form={itemForm}
        setForm={setItemForm}
        onSubmit={handleSaveItem}
        isSubmitting={createItemMutation.isPending || updateItemMutation.isPending}
      />

      {/* Modal Peminjaman Barang */}
      <InventoryBorrowModal
        isOpen={isBorrowModalOpen}
        onClose={() => setIsBorrowModalOpen(false)}
        targetItem={targetItemForBorrow}
        form={borrowForm}
        setForm={setBorrowForm}
        onSubmit={handleSaveBorrow}
        isSubmitting={createBorrowMutation.isPending}
      />

      {/* Modal Pengembalian Barang */}
      <InventoryReturnModal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        selectedBorrowing={selectedBorrowing}
        returnCondition={returnCondition}
        setReturnCondition={setReturnCondition}
        returnNotes={returnNotes}
        setReturnNotes={setReturnNotes}
        onSubmit={handleSaveReturn}
        isSubmitting={updateBorrowStatusMutation.isPending}
      />
    </div>
  );
};

export default InventoryPage;
