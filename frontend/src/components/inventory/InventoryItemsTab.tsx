import React from 'react';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Search, Package, MapPin, Edit2, Trash2 } from 'lucide-react';
import { InventoryItem } from '../../services/inventory';

interface InventoryItemsTabProps {
  items: InventoryItem[];
  isLoadingItems: boolean;
  search: string;
  onSearchChange: (val: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (val: string) => void;
  categories: string[];
  isResident: boolean;
  onOpenBorrow: (item: InventoryItem) => void;
  onEditItem: (item: InventoryItem) => void;
  onDeleteItem: (id: string, name: string) => void;
}

export const InventoryItemsTab: React.FC<InventoryItemsTabProps> = ({
  items,
  isLoadingItems,
  search,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  categories,
  isResident,
  onOpenBorrow,
  onEditItem,
  onDeleteItem,
}) => {
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

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#858585]" />
          <Input
            placeholder="Cari nama barang atau kode inventaris..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>
        <div className="w-full sm:w-60">
          <Select
            value={categoryFilter}
            onValueChange={onCategoryFilterChange}
          >
            <option value="">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white border border-[#d2d2d7] rounded-xl overflow-hidden shadow-xs">
        {isLoadingItems ? (
          <div className="p-8 text-center text-[#707070]">Memuat daftar barang aset...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            Tidak ada barang inventaris yang ditemukan.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Barang &amp; Kategori</TableHead>
                <TableHead>Stok Tersedia</TableHead>
                <TableHead>Total Unit</TableHead>
                <TableHead>Kondisi</TableHead>
                <TableHead>Lokasi Simpan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-semibold text-slate-900">{item.name}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      {item.item_code && <span className="font-mono bg-slate-100 px-1 rounded">{item.item_code}</span>}
                      <span>{item.category}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-xs font-bold rounded-full ${
                        item.available_quantity > 0
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {item.available_quantity} {item.unit}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-600 font-medium">
                    {item.quantity} {item.unit}
                  </TableCell>
                  <TableCell>{getConditionBadge(item.condition)}</TableCell>
                  <TableCell>
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {item.location || '-'}
                    </div>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {item.is_borrowable && item.available_quantity > 0 && !isResident && (
                      <button
                        onClick={() => onOpenBorrow(item)}
                        className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition"
                      >
                        Pinjamkan
                      </button>
                    )}
                    {!isResident && (
                      <>
                        <button
                          onClick={() => onEditItem(item)}
                          className="p-1 text-slate-400 hover:text-slate-700 transition"
                          title="Edit Barang"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteItem(item.id, item.name)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition"
                          title="Hapus Barang"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};
