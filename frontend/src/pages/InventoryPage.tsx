import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  RotateCcw,
  AlertCircle,
  Tag,
  MapPin,
} from 'lucide-react';
import { inventoryService, InventoryItem, InventoryBorrowing } from '../services/inventory';
import { useAuthStore } from '../store/useAuthStore';
import { Select } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { Dialog } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/table';

export const InventoryPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isResident = user?.role === 'resident';

  // Tabs: 'items' or 'borrowings'
  const [activeTab, setActiveTab] = useState<'items' | 'borrowings'>('items');

  // Filter & Search Items
  const [itemSearch, setItemSearch] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [itemCondition, setItemCondition] = useState('');

  // Filter & Search Borrowings
  const [borrowingSearch, setBorrowingSearch] = useState('');
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
    category: 'Peralatan',
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
  });

  // Queries
  const { data: itemsData, isLoading: isItemsLoading } = useQuery({
    queryKey: ['inventory-items', itemCategory, itemCondition, itemSearch],
    queryFn: () =>
      inventoryService.getItems({
        category: itemCategory || undefined,
        condition: itemCondition || undefined,
        search: itemSearch || undefined,
      }),
  });

  const { data: borrowingsData, isLoading: isBorrowingsLoading } = useQuery({
    queryKey: ['inventory-borrowings', borrowingStatus, borrowingSearch],
    queryFn: () =>
      inventoryService.getBorrowings({
        status: borrowingStatus || undefined,
        search: borrowingSearch || undefined,
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
      category: 'Peralatan',
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

  const handleSaveItem = (e: React.FormEvent) => {
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

  const handleSaveBorrow = (e: React.FormEvent) => {
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

  const handleSaveReturn = (e: React.FormEvent) => {
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

  const getConditionBadge = (condition: string) => {
    switch (condition) {
      case 'good':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Baik</span>;
      case 'fair':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200">Cukup</span>;
      case 'damaged':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-rose-50 text-rose-700 border border-rose-200">Rusak</span>;
      case 'lost':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200">Hilang</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200">{condition}</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
      case 'borrowed':
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1 w-fit"><Clock className="w-3 h-3" /> Dipinjam</span>;
      case 'returned':
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit"><CheckCircle2 className="w-3 h-3" /> Kembali</span>;
      case 'overdue':
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 w-fit"><AlertCircle className="w-3 h-3" /> Telat</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700 w-fit">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Package className="w-7 h-7 text-emerald-600" />
            Inventaris & Aset RT
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Pengelolaan aset warga (tenda, kursi, sound system, terpal, alat kerja bakti) & peminjaman.
          </p>
        </div>

        {/* Action Button: Admin Only */}
        {!isResident && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedItem(null);
                resetItemForm();
                setIsItemModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Tambah Barang Aset
            </button>
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
            Daftar Barang & Stok ({itemsData?.total || 0})
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

      {/* Tab: Daftar Barang */}
      {activeTab === 'items' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#858585]" />
              <Input
                type="text"
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="Cari nama barang / kode..."
                className="pl-9"
              />
            </div>
            <div>
              <Select
                value={itemCategory}
                onValueChange={(val) => setItemCategory(val)}
              >
                <option value="">Semua Kategori</option>
                <option value="Peralatan Tenda & Kursi">Peralatan Tenda & Kursi</option>
                <option value="Sound & Elektronik">Sound & Elektronik</option>
                <option value="Kebersihan & Kerja Bakti">Kebersihan & Kerja Bakti</option>
                <option value="Olahraga & Kesenian">Olahraga & Kesenian</option>
                <option value="Perlengkapan Umum">Perlengkapan Umum</option>
              </Select>
            </div>
            <div>
              <Select
                value={itemCondition}
                onValueChange={(val) => setItemCondition(val)}
              >
                <option value="">Semua Kondisi</option>
                <option value="good">Baik</option>
                <option value="fair">Cukup</option>
                <option value="damaged">Rusak</option>
                <option value="lost">Hilang</option>
              </Select>
            </div>
          </div>

          {/* Grid Barang */}
          {isItemsLoading ? (
            <div className="py-12 text-center text-slate-500">Memuat data inventaris...</div>
          ) : (itemsData?.data?.length === 0 || !itemsData?.data) ? (
            <div className="py-12 text-center bg-white rounded-xl border border-slate-200">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-700 font-medium">Belum ada barang inventaris</p>
              <p className="text-xs text-slate-500 mt-1">Tambahkan aset RT agar dapat dipinjam oleh warga.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(itemsData?.data || []).map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between hover:shadow-sm transition"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        {item.item_code && (
                          <span className="text-xs font-mono font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {item.item_code}
                          </span>
                        )}
                        <h3 className="font-semibold text-slate-900 text-base mt-1">
                          {item.name}
                        </h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Tag className="w-3 h-3" /> {item.category}
                        </p>
                      </div>
                      <div>{getConditionBadge(item.condition)}</div>
                    </div>

                    {item.description && (
                      <p className="text-xs text-slate-600 line-clamp-2">
                        {item.description}
                      </p>
                    )}

                    <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500">Total Stok:</span>
                        <p className="font-semibold text-slate-900">
                          {item.quantity} {item.unit}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">Tersedia:</span>
                        <p className={`font-semibold ${item.available_quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {item.available_quantity} {item.unit}
                        </p>
                      </div>
                      {item.location && (
                        <div className="col-span-2 text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> Simpan di: <span className="text-slate-800 font-medium">{item.location}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions: Pinjam / Edit / Hapus */}
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div>
                      {item.is_borrowable ? (
                        <span className="text-[11px] text-emerald-700 font-medium bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
                          Bisa Dipinjam
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          Internal RT
                        </span>
                      )}
                    </div>

                    {!isResident && (
                      <div className="flex items-center gap-2">
                        {item.is_borrowable && item.available_quantity > 0 && (
                          <Button
                            size="sm"
                            onClick={() => handleOpenBorrow(item)}
                          >
                            Catat Pinjam
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditItem(item)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (window.confirm(`Hapus barang ${item.name}?`)) {
                              deleteItemMutation.mutate(item.id);
                            }
                          }}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        >
                          Hapus
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Pencatatan Peminjaman */}
      {activeTab === 'borrowings' && (
        <div className="space-y-4">
          {/* Filter Peminjaman */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#858585]" />
              <Input
                type="text"
                value={borrowingSearch}
                onChange={(e) => setBorrowingSearch(e.target.value)}
                placeholder="Cari nama peminjam / barang..."
                className="pl-9"
              />
            </div>
            <div>
              <Select
                value={borrowingStatus}
                onValueChange={(val) => setBorrowingStatus(val)}
              >
                <option value="">Semua Status</option>
                <option value="borrowed">Sedang Dipinjam</option>
                <option value="returned">Sudah Dikembalikan</option>
                <option value="overdue">Terlambat</option>
              </Select>
            </div>
          </div>

          {/* Table Peminjaman */}
          {isBorrowingsLoading ? (
            <div className="py-12 text-center text-slate-500">Memuat riwayat peminjaman...</div>
          ) : borrowingsData?.data?.length === 0 ? (
            <div className="py-12 text-center bg-white rounded-xl border border-slate-200">
              <RotateCcw className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-700 font-medium">Belum ada transaksi peminjaman</p>
              <p className="text-xs text-slate-500 mt-1">Data peminjaman warga akan tercatat di sini.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Peminjam</TableHead>
                  <TableHead>Barang</TableHead>
                  <TableHead>Jumlah</TableHead>
                  <TableHead>Tgl Pinjam</TableHead>
                  <TableHead>Est. Kembali</TableHead>
                  <TableHead>Status</TableHead>
                  {!isResident && <TableHead className="text-right">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(borrowingsData?.data || []).map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <div className="font-semibold text-[#1d1d1f]">{b.borrower_name}</div>
                      {b.borrower_phone && (
                        <div className="text-[11px] text-[#707070]">{b.borrower_phone}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-[#1d1d1f]">{b.item_name || 'Item'}</div>
                      {b.purpose && <div className="text-[11px] text-[#707070]">{b.purpose}</div>}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-[#1d1d1f]">
                        {b.quantity} {b.unit}
                      </span>
                    </TableCell>
                    <TableCell className="text-[#707070] text-xs font-mono">
                      {b.borrow_date ? new Date(b.borrow_date).toLocaleDateString('id-ID') : '-'}
                    </TableCell>
                    <TableCell className="text-[#707070] text-xs font-mono">
                      {b.expected_return_date ? new Date(b.expected_return_date).toLocaleDateString('id-ID') : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(b.status)}</TableCell>
                    {!isResident && (
                      <TableCell className="text-right">
                        {(b.status === 'borrowed' || b.status === 'approved') && (
                          <button
                            onClick={() => handleOpenReturn(b)}
                            className="apple-btn-primary text-xs px-3 py-1"
                          >
                            Pengembalian
                          </button>
                        )}
                        {b.status === 'returned' && b.actual_return_date && (
                          <span className="text-[11px] text-[#707070]">
                            Kembali: {new Date(b.actual_return_date).toLocaleDateString('id-ID')}
                          </span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {/* Modal Form Tambah/Edit Barang (Admin Only) */}
      <Dialog
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        title={selectedItem ? 'Edit Barang Inventaris' : 'Tambah Barang Inventaris'}
        description="Kelola data aset dan inventaris warga RT"
      >
        <form onSubmit={handleSaveItem} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
              Nama Barang *
            </label>
            <Input
              type="text"
              required
              value={itemForm.name}
              onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
              placeholder="Contoh: Kursi Lipat Chitose, Tenda 4x6"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                Kode Barang (Opsional)
              </label>
              <Input
                type="text"
                value={itemForm.item_code}
                onChange={(e) => setItemForm({ ...itemForm, item_code: e.target.value })}
                placeholder="INV-001"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                Kategori *
              </label>
              <Select
                value={itemForm.category}
                onValueChange={(val) => setItemForm({ ...itemForm, category: val })}
              >
                <option value="Peralatan Tenda & Kursi">Peralatan Tenda & Kursi</option>
                <option value="Sound & Elektronik">Sound & Elektronik</option>
                <option value="Kebersihan & Kerja Bakti">Kebersihan & Kerja Bakti</option>
                <option value="Olahraga & Kesenian">Olahraga & Kesenian</option>
                <option value="Perlengkapan Umum">Perlengkapan Umum</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                Jumlah Total *
              </label>
              <Input
                type="number"
                min="1"
                required
                value={itemForm.quantity}
                onChange={(e) => setItemForm({ ...itemForm, quantity: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                Satuan *
              </label>
              <Input
                type="text"
                required
                value={itemForm.unit}
                onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                placeholder="Unit, Pcs, Set"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                Kondisi Awal
              </label>
              <Select
                value={itemForm.condition}
                onValueChange={(val) => setItemForm({ ...itemForm, condition: val })}
              >
                <option value="good">Baik</option>
                <option value="fair">Cukup</option>
                <option value="damaged">Rusak</option>
                <option value="lost">Hilang</option>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                Lokasi Penyimpanan
              </label>
              <Input
                type="text"
                value={itemForm.location}
                onChange={(e) => setItemForm({ ...itemForm, location: e.target.value })}
                placeholder="Gudang RT / Balai Warga"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
              Deskripsi / Spesifikasi
            </label>
            <Textarea
              rows={2}
              value={itemForm.description}
              onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
              placeholder="Keterangan warna, ukuran, atau merk"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Checkbox
              id="is_borrowable"
              checked={itemForm.is_borrowable}
              onCheckedChange={(checked) => setItemForm({ ...itemForm, is_borrowable: Boolean(checked) })}
            />
            <label htmlFor="is_borrowable" className="text-xs font-medium text-[#1d1d1f] cursor-pointer select-none">
              Dapat dipinjamkan kepada warga umum
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#d2d2d7]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsItemModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={createItemMutation.isPending || updateItemMutation.isPending}
            >
              {createItemMutation.isPending || updateItemMutation.isPending ? 'Menyimpan...' : 'Simpan Barang'}
            </Button>
              </div>
            </form>
      </Dialog>

      {/* Modal Peminjaman Barang (Admin Only) */}
      {targetItemForBorrow && (
        <Dialog
          isOpen={isBorrowModalOpen}
          onClose={() => setIsBorrowModalOpen(false)}
          title="Catat Peminjaman Barang"
          description={`${targetItemForBorrow.name} (Tersedia: ${targetItemForBorrow.available_quantity} ${targetItemForBorrow.unit})`}
        >
          <form onSubmit={handleSaveBorrow} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                Nama Warga / Peminjam *
              </label>
              <Input
                type="text"
                required
                value={borrowForm.borrower_name}
                onChange={(e) => setBorrowForm({ ...borrowForm, borrower_name: e.target.value })}
                placeholder="Nama warga atau perwakilan"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                  No. WhatsApp / HP
                </label>
                <Input
                  type="text"
                  value={borrowForm.borrower_phone}
                  onChange={(e) => setBorrowForm({ ...borrowForm, borrower_phone: e.target.value })}
                  placeholder="0812xxxx"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                  Jumlah Pinjam *
                </label>
                <Input
                  type="number"
                  min="1"
                  max={targetItemForBorrow.available_quantity}
                  required
                  value={borrowForm.quantity}
                  onChange={(e) => setBorrowForm({ ...borrowForm, quantity: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                Keperluan / Acara
              </label>
              <Input
                type="text"
                value={borrowForm.purpose}
                onChange={(e) => setBorrowForm({ ...borrowForm, purpose: e.target.value })}
                placeholder="Contoh: Acara Hajatan / Rapat RT / Kerja Bakti"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                  Tanggal Pinjam
                </label>
                <Input
                  type="date"
                  value={borrowForm.borrow_date}
                  onChange={(e) => setBorrowForm({ ...borrowForm, borrow_date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                  Rencana Kembali
                </label>
                <Input
                  type="date"
                  value={borrowForm.expected_return_date}
                  onChange={(e) => setBorrowForm({ ...borrowForm, expected_return_date: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#d2d2d7]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsBorrowModalOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={createBorrowMutation.isPending}
              >
                {createBorrowMutation.isPending ? 'Menyimpan...' : 'Konfirmasi Peminjaman'}
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Modal Pengembalian Barang (Admin Only) */}
      {selectedBorrowing && (
        <Dialog
          isOpen={isReturnModalOpen}
          onClose={() => setIsReturnModalOpen(false)}
          title="Proses Pengembalian Barang"
          description="Verifikasi kondisi barang saat dikembalikan ke inventaris"
        >
          <form onSubmit={handleSaveReturn} className="space-y-4 mt-2">
            <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1 border border-slate-100">
              <div><span className="text-slate-500">Peminjam:</span> <span className="font-semibold text-slate-900">{selectedBorrowing.borrower_name}</span></div>
              <div><span className="text-slate-500">Barang:</span> <span className="font-semibold text-slate-900">{selectedBorrowing.item_name} ({selectedBorrowing.quantity} {selectedBorrowing.unit})</span></div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Kondisi Barang Saat Kembali *
              </label>
              <Select
                value={returnCondition}
                onValueChange={(val) => setReturnCondition(val)}
              >
                <option value="good">Baik / Utuh</option>
                <option value="fair">Cukup (Sedikit Kotor/Gores)</option>
                <option value="damaged">Rusak</option>
                <option value="lost">Hilang</option>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Catatan Pengurus (Opsional)
              </label>
              <Textarea
                rows={2}
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="Keterangan tambahan jika ada kerusakan atau denda"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#d2d2d7]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsReturnModalOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={updateBorrowStatusMutation.isPending}
              >
                {updateBorrowStatusMutation.isPending ? 'Memproses...' : 'Selesaikan Pengembalian'}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
};

export default InventoryPage;
