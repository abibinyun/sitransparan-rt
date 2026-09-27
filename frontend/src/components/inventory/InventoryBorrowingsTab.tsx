import React from 'react';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table';
import { Select } from '../ui/select';
import { Clock, CheckCircle2, AlertCircle, Phone } from 'lucide-react';
import { InventoryBorrowing } from '../../services/inventory';

interface InventoryBorrowingsTabProps {
  borrowings: InventoryBorrowing[];
  isLoadingBorrowings: boolean;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  isResident: boolean;
  onOpenReturn: (borrowing: InventoryBorrowing) => void;
}

export const InventoryBorrowingsTab: React.FC<InventoryBorrowingsTabProps> = ({
  borrowings,
  isLoadingBorrowings,
  statusFilter,
  onStatusFilterChange,
  isResident,
  onOpenReturn,
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
      case 'borrowed':
        return (
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1 w-fit">
            <Clock className="w-3 h-3" /> Dipinjam
          </span>
        );
      case 'returned':
        return (
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit">
            <CheckCircle2 className="w-3 h-3" /> Kembali
          </span>
        );
      case 'overdue':
        return (
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 w-fit">
            <AlertCircle className="w-3 h-3" /> Telat
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700 w-fit">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Filter */}
      <div className="flex justify-end">
        <div className="w-full sm:w-48">
          <Select
            value={statusFilter}
            onValueChange={onStatusFilterChange}
          >
            <option value="">Semua Status</option>
            <option value="borrowed">Sedang Dipinjam</option>
            <option value="returned">Sudah Kembali</option>
            <option value="overdue">Terlambat</option>
          </Select>
        </div>
      </div>

      {/* Borrowings Table */}
      <div className="bg-white border border-[#d2d2d7] rounded-xl overflow-hidden shadow-xs">
        {isLoadingBorrowings ? (
          <div className="p-8 text-center text-[#707070]">Memuat data peminjaman...</div>
        ) : borrowings.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Belum ada catatan peminjaman.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Peminjam</TableHead>
                <TableHead>Barang &amp; Jumlah</TableHead>
                <TableHead>Tanggal Pinjam</TableHead>
                <TableHead>Target Kembali</TableHead>
                <TableHead>Status</TableHead>
                {!isResident && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {borrowings.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <div className="font-semibold text-slate-900">{b.borrower_name}</div>
                    {b.borrower_phone && (
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {b.borrower_phone}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-slate-900">{b.item_name}</div>
                    <div className="text-xs text-slate-500">
                      {b.quantity} {b.unit}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-[#707070]">
                    {new Date(b.borrow_date).toLocaleDateString('id-ID')}
                  </TableCell>
                  <TableCell className="text-xs text-[#707070]">
                    {b.expected_return_date
                      ? new Date(b.expected_return_date).toLocaleDateString('id-ID')
                      : '-'}
                  </TableCell>
                  <TableCell>{getStatusBadge(b.status)}</TableCell>
                  {!isResident && (
                    <TableCell className="text-right">
                      {b.status === 'borrowed' && (
                        <button
                          onClick={() => onOpenReturn(b)}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition"
                        >
                          Proses Kembali
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
    </div>
  );
};
