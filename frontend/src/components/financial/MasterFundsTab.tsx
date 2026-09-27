import React from 'react';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Wallet, Coins, Plus, Edit2, Trash2 } from 'lucide-react';
import { Fund, FeeCategory } from '../../types/financial';

interface MasterFundsTabProps {
  fundList: Fund[];
  catList: FeeCategory[];
  cashCatsCount: number;
  isFundsLoading: boolean;
  isCatsLoading: boolean;
  onOpenCashCatModal: () => void;
  onOpenAddFundModal: () => void;
  onEditFund: (fund: Fund) => void;
  onDeleteFund: (id: string, isDefault: boolean) => void;
  onOpenAddCategoryModal: () => void;
  onEditCategory: (cat: FeeCategory) => void;
  onDeleteCategory: (id: string) => void;
}

export const MasterFundsTab: React.FC<MasterFundsTabProps> = ({
  fundList,
  catList,
  cashCatsCount,
  isFundsLoading,
  isCatsLoading,
  onOpenCashCatModal,
  onOpenAddFundModal,
  onEditFund,
  onDeleteFund,
  onOpenAddCategoryModal,
  onEditCategory,
  onDeleteCategory,
}) => {
  return (
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
              onClick={onOpenCashCatModal}
              className="gap-1.5 text-xs text-[#1d1d1f] border-[#d2d2d7] hover:bg-white"
            >
              Kategori Kas Masuk &amp; Keluar ({cashCatsCount})
            </Button>
            <Button size="sm" onClick={onOpenAddFundModal} className="gap-1.5 apple-btn-primary">
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
                        onClick={() => onEditFund(f)}
                        className="text-[#707070] hover:text-[#1d1d1f]"
                        title="Edit Kantong Kas & PIC"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      {!f.is_default && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteFund(f.id, f.is_default)}
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
          <Button size="sm" onClick={onOpenAddCategoryModal} className="gap-1.5 apple-btn-primary">
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
                        onClick={() => onEditCategory(cat)}
                        className="text-[#707070] hover:text-[#1d1d1f]"
                        title="Edit Kategori & PIC"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteCategory(cat.id)}
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
  );
};
