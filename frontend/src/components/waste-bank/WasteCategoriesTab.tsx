import React from 'react';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table';
import { Button } from '../ui/button';
import { Edit2, Trash2 } from 'lucide-react';
import { WasteCategory } from '../../services/wasteBank';

interface WasteCategoriesTabProps {
  categories: WasteCategory[];
  isCategoriesLoading: boolean;
  onEditCategory: (category: WasteCategory) => void;
  onDeleteCategory: (id: string, name: string) => void;
}

export const WasteCategoriesTab: React.FC<WasteCategoriesTabProps> = ({
  categories,
  isCategoriesLoading,
  onEditCategory,
  onDeleteCategory,
}) => {
  return (
    <div className="space-y-4">
      <div className="bg-white p-4 border border-[#d2d2d7] rounded-xl shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-[#1d1d1f]">Master Kategori &amp; Skema Bagi Hasil Sampah</h3>
          <p className="text-xs text-[#707070]">
            Atur jenis sampah terpilah yang diterima, patokan harga per kg, dan alokasi bagi hasil warga vs kas pemuda.
          </p>
        </div>
      </div>

      <div className="border border-[#d2d2d7] rounded-xl overflow-hidden bg-white shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Kategori</TableHead>
              <TableHead>Harga Beli per Satuan</TableHead>
              <TableHead>Bagian Warga (%)</TableHead>
              <TableHead>Bagian Kas Pemuda (%)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isCategoriesLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-[#707070]">
                  Memuat kategori...
                </TableCell>
              </TableRow>
            ) : categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-[#707070]">
                  Belum ada kategori sampah yang ditambahkan
                </TableCell>
              </TableRow>
            ) : (
              categories.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-semibold text-[#1d1d1f]">{c.name}</TableCell>
                  <TableCell className="font-semibold text-emerald-700 tabular-nums">
                    Rp {Number(c.price_per_unit || 0).toLocaleString('id-ID')} / {c.unit}
                  </TableCell>
                  <TableCell className="text-[#1d1d1f] font-medium">{c.resident_share_pct}%</TableCell>
                  <TableCell className="text-amber-700 font-medium">{c.karang_taruna_share_pct}%</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full uppercase ${
                        c.is_active
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {c.is_active ? 'Aktif' : 'Non-aktif'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEditCategory(c)}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-[#0071e3]"
                      title="Edit Kategori"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDeleteCategory(c.id, c.name)}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600"
                      title="Hapus Kategori"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
