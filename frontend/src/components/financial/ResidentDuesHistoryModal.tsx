import React, { useState } from 'react';
import { SimpleDialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Select } from '../ui/select';
import { ExternalLink } from 'lucide-react';
import { getFileUrl } from '../../utils/file';

interface ResidentDuesSummaryItem {
  resident_id: string;
  resident_name: string;
  total_paid: number;
  verified_count: number;
  pending_count: number;
  categories: Record<string, { category_name: string; total: number; count: number }>;
  items: any[];
}

interface ResidentDuesHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedResidentId: string | null;
  residentSummary: ResidentDuesSummaryItem | null;
  catList: any[];
}

const MODAL_PAGE_SIZE = 10;

export const ResidentDuesHistoryModal: React.FC<ResidentDuesHistoryModalProps> = ({
  isOpen,
  onClose,
  selectedResidentId,
  residentSummary,
  catList,
}) => {
  const [modalDuesPage, setModalDuesPage] = useState<number>(1);
  const [modalDuesYearFilter, setModalDuesYearFilter] = useState<string>('all');
  const [modalDuesCategoryFilter, setModalDuesCategoryFilter] = useState<string>('all');

  if (!residentSummary || !selectedResidentId) return null;

  // Ekstrak list tahun unik dari item transaksi warga
  const availableYears = Array.from(
    new Set(residentSummary.items.map((i: any) => String(i.period_year || new Date(i.created_at).getFullYear())))
  ).sort((a, b) => Number(b) - Number(a));

  // Filter item transaksi di modal
  const filteredItems = residentSummary.items.filter((item: any) => {
    const itemYear = String(item.period_year || new Date(item.created_at).getFullYear());
    if (modalDuesYearFilter !== 'all' && itemYear !== modalDuesYearFilter) return false;
    if (modalDuesCategoryFilter !== 'all' && item.fee_category_id !== modalDuesCategoryFilter) return false;
    return true;
  });

  const totalModalPages = Math.ceil(filteredItems.length / MODAL_PAGE_SIZE) || 1;
  const paginatedItems = filteredItems.slice(
    (modalDuesPage - 1) * MODAL_PAGE_SIZE,
    modalDuesPage * MODAL_PAGE_SIZE
  );

  const handleClose = () => {
    setModalDuesPage(1);
    setModalDuesYearFilter('all');
    setModalDuesCategoryFilter('all');
    onClose();
  };

  return (
    <SimpleDialog
      isOpen={isOpen}
      onClose={handleClose}
      title={`Buku Iuran: ${residentSummary.resident_name || 'Warga'}`}
      className="max-w-3xl sm:max-w-4xl"
    >
      <div className="space-y-4 text-xs">
        {/* Ringkasan Akumulasi */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <span className="text-[11px] font-medium text-slate-500">Total Telah Lunas Disetor:</span>
            <div className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
              Rp {residentSummary.total_paid.toLocaleString('id-ID')}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-100 text-emerald-800">
              {residentSummary.verified_count} Lunas
            </span>
            {residentSummary.pending_count > 0 && (
              <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-100 text-amber-800">
                {residentSummary.pending_count} Menunggu Verifikasi
              </span>
            )}
          </div>
        </div>

        {/* Pos Iuran Summary Badges */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-slate-700">
            <span className="font-semibold text-xs">Akumulasi per Pos Iuran:</span>
            <span className="text-[10px] text-slate-400">{Object.keys(residentSummary.categories).length} Pos Terbayar</span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
            {Object.values(residentSummary.categories).length === 0 ? (
              <span className="text-slate-400 italic">Belum ada riwayat pembayaran</span>
            ) : (
              Object.values(residentSummary.categories).map((c) => (
                <div
                  key={c.category_name}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-slate-200 bg-white text-[11px]"
                >
                  <span className="text-slate-600 font-medium">{c.category_name}:</span>
                  <strong className="text-emerald-700">Rp {c.total.toLocaleString('id-ID')}</strong>
                  <span className="text-[10px] text-slate-400">({c.count}x)</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Filter Bar Riwayat Transaksi */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 mb-2">
            <span className="font-semibold text-xs text-slate-800">
              Daftar Pembayaran ({filteredItems.length})
            </span>
            <div className="flex items-center gap-2">
              {availableYears.length > 1 && (
                <div className="w-32">
                  <Select
                    value={modalDuesYearFilter}
                    onValueChange={(val) => {
                      setModalDuesYearFilter(val);
                      setModalDuesPage(1);
                    }}
                  >
                    <option value="all">Semua Tahun</option>
                    {availableYears.map((y) => (
                      <option key={y} value={y}>
                        Tahun {y}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              {catList.length > 1 && (
                <div className="w-36">
                  <Select
                    value={modalDuesCategoryFilter}
                    onValueChange={(val) => {
                      setModalDuesCategoryFilter(val);
                      setModalDuesPage(1);
                    }}
                  >
                    <option value="all">Semua Pos</option>
                    {catList.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* List Item Transaksi dengan Scroll & Pagination */}
          <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white overflow-hidden">
            {filteredItems.length === 0 ? (
              <div className="p-4 text-center text-slate-400 italic">
                Tidak ada transaksi pembayaran yang cocok.
              </div>
            ) : (
              paginatedItems.map((item: any) => (
                <div key={item.id} className="p-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-800 truncate">
                        {item.fee_category_name || 'Iuran'}
                      </span>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        ({item.period_month ? `${item.period_month}/` : ''}{item.period_year || '-'})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          item.status === 'verified'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.status === 'rejected'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {item.status === 'verified' ? 'Lunas' : item.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                      </span>
                      {item.proof_url && (
                        <a
                          href={getFileUrl(item.proof_url)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-indigo-600 hover:underline flex items-center gap-0.5"
                        >
                          Bukti <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                      <span className="text-[10px] text-slate-400">
                        {new Date(item.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-slate-900 block">
                      Rp {Number(item.amount).toLocaleString('id-ID')}
                    </span>
                    {item.verified_at && (
                      <span className="text-[9px] text-slate-400 block">
                        Diverifikasi: {new Date(item.verified_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination Controls */}
          {totalModalPages > 1 && (
            <div className="flex items-center justify-between pt-3 text-[11px] text-slate-500">
              <span>
                Halaman {modalDuesPage} dari {totalModalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={modalDuesPage <= 1}
                  onClick={() => setModalDuesPage((p) => Math.max(1, p - 1))}
                  className="h-6 px-2 text-[10px]"
                >
                  Sebelumnya
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={modalDuesPage >= totalModalPages}
                  onClick={() => setModalDuesPage((p) => p + 1)}
                  className="h-6 px-2 text-[10px]"
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </SimpleDialog>
  );
};
