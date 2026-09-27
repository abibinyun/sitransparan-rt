import React from 'react';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table';
import { Button } from '../ui/button';
import { Edit2, Trash2 } from 'lucide-react';
import { MeetingActionItem } from '../../types/meeting';

interface ActionItemsTabProps {
  actionItems: MeetingActionItem[];
  isLoadingActionItems: boolean;
  isAdmin: boolean;
  onToggleStatus: (id: string, currentStatus: string) => void;
  onOpenCreate: () => void;
  onOpenEdit: (item: MeetingActionItem) => void;
  onDelete: (id: string, task: string) => void;
}

export const ActionItemsTab: React.FC<ActionItemsTabProps> = ({
  actionItems,
  isLoadingActionItems,
  isAdmin,
  onToggleStatus,
  onOpenCreate,
  onOpenEdit,
  onDelete,
}) => {
  return (
    <div className="rounded-xl border border-[#d2d2d7] bg-white shadow-xs overflow-hidden">
      <div className="p-4 border-b border-[#d2d2d7] bg-gray-50 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-gray-800">Matriks Tindak Lanjut (*Action Items*)</h2>
          <p className="text-xs text-gray-500">
            Seluruh tugas yang dimandatkan dari hasil rapat dan musyawarah lingkungan
          </p>
        </div>
        {isAdmin && (
          <Button
            size="sm"
            onClick={onOpenCreate}
            className="text-xs h-8"
          >
            Tambah Tugas
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Tugas</TableHead>
            <TableHead>Penanggung Jawab (PIC)</TableHead>
            <TableHead>Tenggat Waktu</TableHead>
            <TableHead>Catatan</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoadingActionItems ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                Memuat tugas warga...
              </TableCell>
            </TableRow>
          ) : actionItems.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                Belum ada penugasan atau tindak lanjut yang tercatat.
              </TableCell>
            </TableRow>
          ) : (
            actionItems.map((item: MeetingActionItem) => (
              <TableRow key={item.id}>
                <TableCell>
                  <button
                    disabled={!isAdmin}
                    onClick={() => onToggleStatus(item.id, item.status)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase transition ${
                      item.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-800'
                        : item.status === 'cancelled'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {item.status}
                  </button>
                </TableCell>
                <TableCell className="font-medium text-[#1d1d1f]">
                  {item.task}
                </TableCell>
                <TableCell className="text-[#707070]">
                  {item.assignee_name}
                </TableCell>
                <TableCell className="text-[#707070] font-mono text-xs">
                  {item.due_date || '-'}
                </TableCell>
                <TableCell className="text-[#707070] max-w-xs truncate">
                  {item.notes || '-'}
                </TableCell>
                <TableCell className="text-right">
                  {isAdmin && (
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-slate-500 hover:text-[#0071e3]"
                        title="Edit Tugas"
                        onClick={() => onOpenEdit(item)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        title="Hapus Tugas"
                        onClick={() => onDelete(item.id, item.task)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
