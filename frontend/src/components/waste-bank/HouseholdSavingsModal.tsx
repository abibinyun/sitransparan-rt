import React from 'react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table';

interface HouseholdSavingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  household: any | null;
}

export const HouseholdSavingsModal: React.FC<HouseholdSavingsModalProps> = ({
  isOpen,
  onClose,
  household,
}) => {
  if (!household) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Buku Tabungan: ${household.family_head_name}`}
      description={`No. KK: ${household.kk_number} · No. Rumah: ${household.house_number || '-'}`}
      className="max-w-3xl"
    >
      <div className="space-y-4">
        {/* Ringkasan Saldo Tabungan KK */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 border border-[#d2d2d7] rounded-xl text-center">
          <div>
            <span className="text-[11px] font-semibold text-[#707070] uppercase">Total Saldo Tabungan</span>
            <div className="text-xl font-bold text-emerald-700 mt-1 tabular-nums">
              Rp {(household.total_earnings || 0).toLocaleString('id-ID')}
            </div>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-[#707070] uppercase">Total Bobot Terpilah</span>
            <div className="text-xl font-bold text-[#1d1d1f] mt-1 tabular-nums">
              {(household.total_weight || 0).toFixed(1)} kg
            </div>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-[#707070] uppercase">Frekuensi Setoran</span>
            <div className="text-xl font-bold text-[#0066cc] mt-1 tabular-nums">
              {household.deposit_count || 0} Kali
            </div>
          </div>
        </div>

        {/* Riwayat Setoran */}
        <div className="border border-[#d2d2d7] rounded-xl overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Bobot (kg)</TableHead>
                <TableHead>Total Bruto</TableHead>
                <TableHead>Bagian Warga</TableHead>
                <TableHead>Kas Pemuda</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!household.deposits || household.deposits.length === 0) ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-[#707070] text-xs">
                    Belum ada riwayat setoran detail untuk KK ini.
                  </TableCell>
                </TableRow>
              ) : (
                household.deposits.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell className="text-xs font-mono text-[#707070]">
                      {new Date(d.deposit_date).toLocaleDateString('id-ID')}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-[#1d1d1f]">
                      {Number(d.total_weight || 0).toFixed(1)} kg
                    </TableCell>
                    <TableCell className="text-xs font-medium text-[#1d1d1f] tabular-nums">
                      Rp {(d.total_amount || 0).toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-emerald-700 tabular-nums">
                      Rp {(d.resident_share || 0).toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-amber-700 tabular-nums">
                      Rp {(d.karang_taruna_share || 0).toLocaleString('id-ID')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end pt-3 border-t border-[#d2d2d7]">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Tutup
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
