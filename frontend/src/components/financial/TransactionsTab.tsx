import React from 'react';
import { Card } from '../ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select } from '../ui/select';
import { Search, ExternalLink } from 'lucide-react';
import { Fund } from '../../types/financial';
import { getFileUrl } from '../../utils/file';

interface TransactionsTabProps {
  fundList: Fund[];
  filteredTx: any[];
  txTotal: number;
  txPage: number;
  txLimit: number;
  txTotalPages: number;
  txTypeFilter: 'all' | 'income' | 'expense';
  txFundFilter: string;
  txSearch: string;
  isTxLoading: boolean;
  onTypeFilterChange: (type: 'all' | 'income' | 'expense') => void;
  onFundFilterChange: (fundId: string) => void;
  onSearchChange: (search: string) => void;
  onPageChange: (page: number) => void;
}

export const TransactionsTab: React.FC<TransactionsTabProps> = ({
  fundList,
  filteredTx,
  txTotal,
  txPage,
  txLimit,
  txTotalPages,
  txTypeFilter,
  txFundFilter,
  txSearch,
  isTxLoading,
  onTypeFilterChange,
  onFundFilterChange,
  onSearchChange,
  onPageChange,
}) => {
  return (
    <div className="space-y-4">
      {/* Ringkasan Saldo per Kantong Kas RT */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {fundList.map((f: any) => (
          <Card
            key={f.id}
            onClick={() => onFundFilterChange(txFundFilter === f.id ? 'all' : f.id)}
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
              onClick={() => onTypeFilterChange('all')}
              className={`px-3 py-1 rounded-md transition-all ${
                txTypeFilter === 'all' ? 'bg-white text-[#0066cc] shadow-xs' : 'text-[#707070] hover:text-[#1d1d1f]'
              }`}
            >
              Semua Arus
            </button>
            <button
              onClick={() => onTypeFilterChange('income')}
              className={`px-3 py-1 rounded-md transition-all ${
                txTypeFilter === 'income' ? 'bg-white text-emerald-700 shadow-xs' : 'text-[#707070] hover:text-[#1d1d1f]'
              }`}
            >
              Pemasukan
            </button>
            <button
              onClick={() => onTypeFilterChange('expense')}
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
                onChange={(e) => onFundFilterChange(e.target.value)}
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
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#707070]" />
          <Input
            placeholder="Cari deskripsi / kategori..."
            value={txSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            className="text-xs pl-8 h-8 bg-[#f5f5f7] border-[#d2d2d7]"
          />
        </div>
      </div>

      {/* Table Transaksi */}
      <div className="rounded-xl border border-[#d2d2d7] bg-white shadow-xs overflow-hidden">
        {isTxLoading ? (
          <div className="p-8 text-center text-xs text-[#707070]">Memuat transaksi...</div>
        ) : filteredTx.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#707070]">Belum ada transaksi kas tercatat</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Kantong Kas</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Keterangan / Deskripsi</TableHead>
                <TableHead>Jumlah</TableHead>
                <TableHead>Bukti Nota</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTx.map((tx: any) => (
                <TableRow key={tx.id}>
                  <TableCell className="text-xs text-[#707070] whitespace-nowrap font-medium">
                    {new Date(tx.transaction_date).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#f4f8fb] text-[#0066cc] border border-[#d2d2d7]">
                      {tx.fund_name || 'Kas Utama'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#f5f5f7] text-[#1d1d1f] border border-[#d2d2d7]">
                      {tx.category}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-[#1d1d1f] max-w-xs truncate font-medium">
                    {tx.description || '-'}
                  </TableCell>
                  <TableCell className={`text-xs font-semibold tabular-nums ${tx.type === 'income' ? 'text-[#0066cc]' : 'text-rose-600'}`}>
                    {tx.type === 'income' ? '+ ' : '- '}
                    Rp {Number(tx.amount).toLocaleString('id-ID')}
                  </TableCell>
                  <TableCell>
                    {tx.proof_url ? (
                      <a
                        href={getFileUrl(tx.proof_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-[#0066cc] hover:underline inline-flex items-center gap-1 font-semibold"
                      >
                        Lihat <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-[#858585]">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Pagination Footer */}
        {txTotal > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-[#d2d2d7] bg-[#f5f5f7]">
            <span className="text-xs text-[#707070] font-medium">
              Menampilkan {(txPage - 1) * txLimit + 1} - {Math.min(txPage * txLimit, txTotal)} dari {txTotal} transaksi
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={txPage <= 1}
                onClick={() => onPageChange(Math.max(1, txPage - 1))}
                className="h-8 px-2.5 text-xs text-[#1d1d1f] border-[#d2d2d7] hover:bg-white"
              >
                Sebelumnya
              </Button>
              <div className="text-xs font-semibold text-[#1d1d1f] px-2 tabular-nums">
                {txPage} / {txTotalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={txPage >= txTotalPages}
                onClick={() => onPageChange(txPage + 1)}
                className="h-8 px-2.5 text-xs text-[#1d1d1f] border-[#d2d2d7] hover:bg-white"
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
