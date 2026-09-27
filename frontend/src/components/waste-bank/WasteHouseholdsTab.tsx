import React from 'react';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table';
import { Button } from '../ui/button';
import { Eye } from 'lucide-react';

interface WasteHouseholdsTabProps {
  householdsList: any[];
  isHouseholdsLoading: boolean;
  isResident: boolean;
  onSelectHousehold: (household: any) => void;
}

export const WasteHouseholdsTab: React.FC<WasteHouseholdsTabProps> = ({
  householdsList,
  isHouseholdsLoading,
  isResident,
  onSelectHousehold,
}) => {
  return (
    <div className="border border-[#d2d2d7] rounded-xl overflow-hidden bg-white shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kepala Keluarga / KK</TableHead>
            <TableHead>Total Bobot Sampah</TableHead>
            <TableHead>Saldo Tabungan Warga</TableHead>
            <TableHead>Frekuensi Setor</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isHouseholdsLoading ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-[#707070]">
                Memuat buku tabungan...
              </TableCell>
            </TableRow>
          ) : householdsList.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-[#707070]">
                {isResident
                  ? 'Belum ada catatan setoran tabungan untuk keluarga Anda.'
                  : 'Belum ada data tabungan KK'}
              </TableCell>
            </TableRow>
          ) : (
            householdsList.map((h: any) => (
              <TableRow key={h.kk_number}>
                <TableCell>
                  <div className="font-semibold text-[#1d1d1f]">{h.family_head_name}</div>
                  <div className="text-[11px] text-[#707070] font-mono">
                    KK: {h.kk_number} · Rumah: {h.house_number || '-'}
                  </div>
                </TableCell>
                <TableCell className="font-semibold text-[#1d1d1f]">
                  {Number(h.total_weight || 0).toFixed(1)} kg
                </TableCell>
                <TableCell className="font-bold text-emerald-700 text-sm tabular-nums">
                  Rp {(h.total_earnings || 0).toLocaleString('id-ID')}
                </TableCell>
                <TableCell className="text-[#707070] text-xs">
                  {h.deposit_count || 0} Kali
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSelectHousehold(h)}
                    className="h-7 text-xs border-[#d2d2d7] text-[#0066cc] gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" /> Detail Buku
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
