import React from 'react';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table';
import { Button } from '../ui/button';
import { WasteDeposit } from '../../services/wasteBank';

interface WasteDepositsTabProps {
  depositsList: WasteDeposit[];
  isDepositsLoading: boolean;
  isResident: boolean;
  onVerifyDeposit: (id: string) => void;
  onPayoutDeposit?: (id: string) => void;
}

export const WasteDepositsTab: React.FC<WasteDepositsTabProps> = ({
  depositsList,
  isDepositsLoading,
  isResident,
  onVerifyDeposit,
  onPayoutDeposit,
}) => {
  return (
    <div className="border border-[#d2d2d7] rounded-xl overflow-hidden bg-white shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tanggal</TableHead>
            <TableHead>Kepala Keluarga / KK</TableHead>
            <TableHead>Bobot (kg)</TableHead>
            <TableHead>Total Bruto</TableHead>
            <TableHead>Bagian Warga</TableHead>
            <TableHead>Kas Pemuda</TableHead>
            <TableHead>Status</TableHead>
            {!isResident && <TableHead className="text-right">Aksi</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isDepositsLoading ? (
            <TableRow>
              <TableCell colSpan={8} className="py-8 text-center text-[#707070]">
                Memuat data setoran...
              </TableCell>
            </TableRow>
          ) : depositsList.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="py-8 text-center text-[#707070]">
                Belum ada catatan setoran sampah
              </TableCell>
            </TableRow>
          ) : (
            depositsList.map((d: WasteDeposit) => (
              <TableRow key={d.id}>
                <TableCell className="text-[#707070] whitespace-nowrap font-mono text-xs">
                  {d.deposit_date
                    ? new Date(d.deposit_date).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '-'}
                </TableCell>
                <TableCell>
                  <div className="font-semibold text-[#1d1d1f]">{d.family_head_name}</div>
                  <div className="text-[11px] text-[#707070] font-mono">
                    KK: {d.kk_number} {d.rt_number ? `· RT ${d.rt_number}` : ''}
                  </div>
                </TableCell>
                <TableCell className="font-semibold text-[#1d1d1f]">
                  {Number(d.total_weight_kg || 0).toFixed(1)} kg
                </TableCell>
                <TableCell className="text-[#1d1d1f] font-medium tabular-nums">
                  Rp {(d.total_gross_amount || 0).toLocaleString('id-ID')}
                </TableCell>
                <TableCell className="font-bold text-emerald-700 tabular-nums">
                  Rp {(d.resident_earnings_amount || 0).toLocaleString('id-ID')}
                </TableCell>
                <TableCell className="font-medium text-amber-700 tabular-nums">
                  Rp {(d.karang_taruna_amount || 0).toLocaleString('id-ID')}
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full uppercase ${
                      d.status === 'verified'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {d.status}
                  </span>
                </TableCell>
                {!isResident && (
                  <TableCell className="text-right space-x-1">
                    {d.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onVerifyDeposit(d.id)}
                        className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      >
                        Verifikasi
                      </Button>
                    )}
                    {d.status === 'verified' && onPayoutDeposit && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onPayoutDeposit(d.id)}
                        className="h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                      >
                        Tandai Cair
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
