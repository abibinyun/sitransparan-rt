import React from 'react';
import { Card } from '../ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Badge } from '../ui/badge';
import { Search, ChevronRight, Check, X, ExternalLink, ArrowDownRight, ArrowUpRight, Users } from 'lucide-react';
import { FeeCategory, DuesPayment } from '../../types/financial';
import { getFileUrl } from '../../utils/file';

interface DuesTabProps {
  catList: FeeCategory[];
  duesCategoryBalances: Record<string, { collected: number; spent: number; balance: number; verifiedCount: number; pendingCount: number }>;
  duesCategoryFilter: string;
  duesViewMode: 'resident' | 'history' | 'disbursements';
  duesStatusFilter: 'all' | 'pending' | 'verified' | 'rejected';
  duesSearch: string;
  isResident: boolean;
  isDuesLoading: boolean;
  isResidentsLoading: boolean;
  residentDuesSummary: any[];
  paginatedDues: DuesPayment[];
  filteredDuesTotal: number;
  duesPage: number;
  duesLimit: number;
  totalDuesPages: number;
  duesDisbursementList: any[];
  duesListCount: number;
  onCategoryFilterChange: (id: string) => void;
  onViewModeChange: (mode: 'resident' | 'history' | 'disbursements') => void;
  onStatusFilterChange: (status: 'all' | 'pending' | 'verified' | 'rejected') => void;
  onSearchChange: (search: string) => void;
  onPageChange: (page: number) => void;
  onOpenDisburseModal: (catId: string) => void;
  onSelectResident: (residentId: string) => void;
  onVerifyDues: (id: string, status: 'verified' | 'rejected') => void;
}

export const DuesTab: React.FC<DuesTabProps> = ({
  catList,
  duesCategoryBalances,
  duesCategoryFilter,
  duesViewMode,
  duesStatusFilter,
  duesSearch,
  isResident,
  isDuesLoading,
  isResidentsLoading,
  residentDuesSummary,
  paginatedDues,
  filteredDuesTotal,
  duesPage,
  duesLimit,
  totalDuesPages,
  duesDisbursementList,
  duesListCount,
  onCategoryFilterChange,
  onViewModeChange,
  onStatusFilterChange,
  onSearchChange,
  onPageChange,
  onOpenDisburseModal,
  onSelectResident,
  onVerifyDues,
}) => {
  return (
    <div className="space-y-4">
      {/* Ringkasan Saldo per Pos Iuran Warga */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {catList.map((c) => {
          const b = duesCategoryBalances[c.id] || { collected: 0, spent: 0, balance: 0, verifiedCount: 0, pendingCount: 0 };
          return (
            <Card
              key={c.id}
              onClick={() => onCategoryFilterChange(duesCategoryFilter === c.id ? 'all' : c.id)}
              className={`p-3 cursor-pointer transition-all flex flex-col justify-between gap-1.5 border-[#d2d2d7] ${
                duesCategoryFilter === c.id
                  ? 'border-[#0071e3] ring-1 ring-[#0071e3] bg-[#f4f8fb]'
                  : 'hover:border-[#0071e3]'
              }`}
              title="Klik untuk filter iuran pos ini"
            >
              <div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold text-[#1d1d1f] truncate">{c.name}</span>
                  <span className="text-[10px] text-[#707070] shrink-0 font-medium">
                    {c.period === 'monthly' ? 'Bulanan' : 'Insidental'}
                  </span>
                </div>
                <div className="mt-1 text-base font-bold text-[#1d1d1f] tabular-nums">
                  Rp {b.balance.toLocaleString('id-ID')}
                </div>
                <div className="text-[10px] text-[#707070] truncate mt-0.5">
                  Masuk: Rp {b.collected.toLocaleString('id-ID')}
                </div>
              </div>

              {!isResident && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDisburseModal(c.id);
                  }}
                  className="mt-1 text-left text-[11px] text-[#0071e3] hover:underline font-semibold"
                >
                  Salurkan Dana &rarr;
                </button>
              )}
            </Card>
          );
        })}
      </div>

      {/* Sub-view Toggle: Per Warga vs Riwayat Iuran Masuk vs Riwayat Pengeluaran Iuran */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 p-3 bg-white border border-[#d2d2d7] rounded-xl shadow-xs">
        <div className="flex items-center overflow-x-auto scrollbar-none pb-1 lg:pb-0">
          <div className="inline-flex rounded-lg border border-[#d2d2d7] bg-[#f5f5f7] p-1 text-xs font-semibold whitespace-nowrap">
            <button
              onClick={() => onViewModeChange('resident')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                duesViewMode === 'resident'
                  ? 'bg-white text-[#0066cc] shadow-xs'
                  : 'text-[#707070] hover:text-[#1d1d1f]'
              }`}
            >
              <Users className="h-3.5 w-3.5" /> Buku Iuran ({residentDuesSummary.length})
            </button>
            <button
              onClick={() => onViewModeChange('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                duesViewMode === 'history'
                  ? 'bg-white text-[#0066cc] shadow-xs'
                  : 'text-[#707070] hover:text-[#1d1d1f]'
              }`}
            >
              <ArrowDownRight className="h-3.5 w-3.5 text-emerald-600" /> Iuran Masuk ({duesListCount})
            </button>
            {!isResident && (
              <button
                onClick={() => onViewModeChange('disbursements')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                  duesViewMode === 'disbursements'
                    ? 'bg-white text-[#0066cc] shadow-xs'
                    : 'text-[#707070] hover:text-[#1d1d1f]'
                }`}
              >
                <ArrowUpRight className="h-3.5 w-3.5 text-rose-600" /> Pengeluaran / Penyaluran ({duesDisbursementList.length})
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
          {/* Filter Kategori Pos Iuran */}
          <div className="w-full sm:w-44">
            <Select
              value={duesCategoryFilter}
              onChange={(e) => onCategoryFilterChange(e.target.value)}
              className="text-xs h-9 bg-white border-[#d2d2d7]"
            >
              <option value="all">Semua Pos Iuran</option>
              {catList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>

          {duesViewMode === 'history' && (
            <div className="w-full sm:w-36">
              <Select
                value={duesStatusFilter}
                onChange={(e) => onStatusFilterChange(e.target.value as any)}
                aria-label="Filter Status Verifikasi Iuran"
                className="text-xs h-9 bg-white border-[#d2d2d7]"
              >
                <option value="all">Semua Status</option>
                <option value="pending">Menunggu Verifikasi</option>
                <option value="verified">Lunas / Terverifikasi</option>
                <option value="rejected">Ditolak</option>
              </Select>
            </div>
          )}
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#858585]" />
            <Input
              type="text"
              placeholder={duesViewMode === 'resident' ? 'Cari nama warga...' : 'Cari keterangan / pos...'}
              value={duesSearch}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8 text-xs h-9 bg-white border-[#d2d2d7]"
            />
          </div>
        </div>
      </div>

      {/* View 1: Buku Iuran per Warga */}
      {duesViewMode === 'resident' && (
        <div className="rounded-xl border border-[#d2d2d7] bg-white shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#d2d2d7] bg-[#f5f5f7] flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-sm text-[#1d1d1f]">Rekapitulasi Iuran Setiap Warga</h3>
              <p className="text-xs text-[#707070]">
                Melihat pos iuran apa saja yang sudah lunas dan status pembayaran masing-masing warga
              </p>
            </div>
          </div>

          {isDuesLoading || isResidentsLoading ? (
            <div className="p-6 text-center text-[#707070]">Memuat rekapitulasi iuran warga...</div>
          ) : residentDuesSummary.length === 0 ? (
            <div className="p-6 text-center text-[#707070]">
              {duesSearch ? 'Tidak ada data warga yang cocok dengan pencarian.' : 'Belum ada data warga terdaftar.'}
            </div>
          ) : (
            <div className="divide-y divide-[#e2e2e5]">
              {residentDuesSummary.map((res) => {
                const catEntries = Object.values(res.categories) as any[];
                return (
                  <div key={res.resident_id} className="p-4 hover:bg-[#f5f5f7]/60 transition-colors">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#1d1d1f]">{res.resident_name}</span>
                          {res.pending_count > 0 && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px]">
                              {res.pending_count} Perlu Verifikasi
                            </Badge>
                          )}
                          {res.verified_count > 0 && (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
                              {res.verified_count} Transaksi Lunas
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-[#707070]">
                          Total Disetor: <strong className="text-[#1d1d1f] tabular-nums">Rp {res.total_paid.toLocaleString('id-ID')}</strong> ({res.items.length} catatan pembayaran)
                        </p>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSelectResident(res.resident_id)}
                        className="text-xs h-8 gap-1.5 self-start sm:self-auto text-[#0066cc] border-[#d2d2d7] hover:bg-[#f4f8fb]"
                      >
                        Rincian Pembayaran <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Badges of paid categories */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {catEntries.length === 0 ? (
                        <span className="text-[11px] text-[#858585] italic">Belum ada riwayat pembayaran iuran</span>
                      ) : (
                        catEntries.map((c: any) => (
                          <div
                            key={c.category_name}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#f5f5f7] border border-[#d2d2d7] text-xs"
                          >
                            <span className="font-semibold text-[#1d1d1f]">{c.category_name}:</span>
                            <span className="text-emerald-700 font-bold tabular-nums">
                              Rp {c.total.toLocaleString('id-ID')}
                            </span>
                            <span className="text-[10px] text-[#707070] font-normal">({c.count}x)</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* View 2: Riwayat Iuran Masuk (Detail Transaksi) */}
      {duesViewMode === 'history' && (
        <div className="rounded-xl border border-[#d2d2d7] bg-white shadow-xs overflow-hidden">
          {isDuesLoading ? (
            <div className="p-8 text-center text-xs text-[#707070]">Memuat riwayat iuran...</div>
          ) : paginatedDues.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#707070]">Tidak ada data pembayaran iuran ditemukan</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Warga / Pembayar</TableHead>
                  <TableHead>Jenis Iuran</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead>Nominal</TableHead>
                  <TableHead>Bukti</TableHead>
                  <TableHead>Status</TableHead>
                  {!isResident && <TableHead className="text-right">Aksi Verifikasi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDues.map((dues) => (
                  <TableRow key={dues.id}>
                    <TableCell className="font-semibold text-[#1d1d1f]">
                      {dues.resident_name || '-'}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#f4f8fb] text-[#0066cc] border border-[#d2d2d7]">
                        {dues.fee_category_name || 'Iuran'}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-[#707070] font-medium">
                      {dues.period_month ? `Bulan ${dues.period_month} / ` : ''}
                      {dues.period_year}
                    </TableCell>
                    <TableCell className="font-semibold text-[#1d1d1f] tabular-nums">
                      Rp {Number(dues.amount).toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell>
                      {dues.proof_url ? (
                        <a
                          href={getFileUrl(dues.proof_url)}
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
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold uppercase tracking-wider border ${
                          dues.status === 'verified'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : dues.status === 'rejected'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {dues.status === 'verified' ? 'Lunas' : dues.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                      </Badge>
                    </TableCell>
                    {!isResident && (
                      <TableCell className="text-right">
                        {dues.status === 'pending' ? (
                          <div className="flex justify-end gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => onVerifyDues(dues.id, 'verified')}
                              className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                              title="Setujui Pembayaran"
                            >
                              <Check className="h-3.5 w-3.5 mr-1" /> Terima
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onVerifyDues(dues.id, 'rejected')}
                              className="h-7 px-2 text-xs text-rose-600 border-[#d2d2d7] hover:bg-rose-50 font-medium"
                              title="Tolak Pembayaran"
                            >
                              <X className="h-3.5 w-3.5 mr-1" /> Tolak
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-[#858585] italic">Selesai</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination Footer */}
          {filteredDuesTotal > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-[#d2d2d7] bg-[#f5f5f7]">
              <span className="text-xs text-[#707070] font-medium">
                Menampilkan {(duesPage - 1) * duesLimit + 1} - {Math.min(duesPage * duesLimit, filteredDuesTotal)} dari {filteredDuesTotal} catatan
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={duesPage <= 1}
                  onClick={() => onPageChange(Math.max(1, duesPage - 1))}
                  className="h-8 px-2.5 text-xs text-[#1d1d1f] border-[#d2d2d7] hover:bg-white"
                >
                  Sebelumnya
                </Button>
                <div className="text-xs font-semibold text-[#1d1d1f] px-2 tabular-nums">
                  {duesPage} / {totalDuesPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={duesPage >= totalDuesPages}
                  onClick={() => onPageChange(duesPage + 1)}
                  className="h-8 px-2.5 text-xs text-[#1d1d1f] border-[#d2d2d7] hover:bg-white"
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* View 3: Riwayat Penyaluran / Pengeluaran Pos Iuran Warga */}
      {duesViewMode === 'disbursements' && !isResident && (
        <div className="rounded-xl border border-[#d2d2d7] bg-white shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#d2d2d7] bg-[#f5f5f7] flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-sm text-[#1d1d1f]">Riwayat Penyaluran Dana Iuran Warga</h3>
              <p className="text-xs text-[#707070]">
                Daftar belanja langsung keperluan pos dan pemindahan alokasi ke kantong kas RT
              </p>
            </div>
          </div>

          {duesDisbursementList.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#707070]">Belum ada penyaluran dana dari pos iuran warga</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Pos Asal Iuran</TableHead>
                  <TableHead>Tujuan Penyaluran</TableHead>
                  <TableHead>Keterangan / Keperluan</TableHead>
                  <TableHead>Nominal</TableHead>
                  <TableHead>Bukti Nota</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {duesDisbursementList.map((tx: any) => (
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
                        {tx.disbursed_from_category_name || tx.disbursed_from_category_id || 'Pos Iuran'}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-[#1d1d1f]">
                      {tx.fund_id ? `Masuk Kas: ${tx.fund_name || 'Kantong Kas RT'}` : 'Belanja Langsung / Vendor'}
                    </TableCell>
                    <TableCell className="text-xs text-[#1d1d1f] max-w-xs truncate font-medium">
                      {tx.description || '-'}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-rose-600 tabular-nums">
                      - Rp {Number(tx.amount).toLocaleString('id-ID')}
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
        </div>
      )}
    </div>
  );
};
