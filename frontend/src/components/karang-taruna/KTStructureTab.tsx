import React from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select } from '../ui/select';
import { Flame, Users, Plus, Edit2, Trash2, Layers, Phone } from 'lucide-react';
import { KarangTarunaPeriod, KarangTarunaMember } from '../../types/karang_taruna';

interface KTStructureTabProps {
  currentPeriod: KarangTarunaPeriod | null;
  currentPeriodId: string;
  periods: KarangTarunaPeriod[];
  members: KarangTarunaMember[];
  loadingMembers: boolean;
  loadingActive: boolean;
  isResident: boolean;
  onSelectPeriod: (id: string) => void;
  onOpenEditPeriodModal: (period: KarangTarunaPeriod) => void;
  onOpenAddMemberModal: () => void;
  onOpenEditMemberModal: (member: KarangTarunaMember) => void;
  onDeleteMember: (id: string, name: string) => void;
}

export const KTStructureTab: React.FC<KTStructureTabProps> = ({
  currentPeriod,
  currentPeriodId,
  periods,
  members,
  loadingMembers,
  loadingActive,
  isResident,
  onSelectPeriod,
  onOpenEditPeriodModal,
  onOpenAddMemberModal,
  onOpenEditMemberModal,
  onDeleteMember,
}) => {
  return (
    <div className="space-y-6">
      {/* Period Selector Header on KT Structure */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#d2d2d7] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-200">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#707070]">Periode Karang Taruna</p>
            <h3 className="text-sm font-bold text-[#1d1d1f] flex items-center gap-1.5">
              {currentPeriod?.name || 'Belum ada periode aktif'}
              {currentPeriod?.status === 'active' && (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
                  Aktif
                </Badge>
              )}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Label htmlFor="periodSelect" className="text-xs text-[#707070] whitespace-nowrap">
            Ganti Periode:
          </Label>
          <Select
            id="periodSelect"
            value={currentPeriodId}
            onChange={(e) => onSelectPeriod(e.target.value)}
            className="text-xs font-semibold bg-white border-[#d2d2d7]"
          >
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.status})
              </option>
            ))}
          </Select>
          {!isResident && currentPeriod && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenEditPeriodModal(currentPeriod)}
              className="h-8 text-xs border-[#d2d2d7]"
              title="Edit masa bakti pemuda"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {loadingMembers || loadingActive ? (
        <div className="p-12 text-center text-[#707070]">Memuat struktur pengurus pemuda...</div>
      ) : members.length === 0 ? (
        <Card className="p-12 text-center bg-white border-dashed border-[#d2d2d7]">
          <Users className="h-10 w-10 mx-auto text-[#858585] mb-3" />
          <p className="font-bold text-[#1d1d1f]">Belum ada pengurus pemuda di periode ini</p>
          <p className="text-xs text-[#707070] mt-1 mb-4">
            Tambahkan warga muda sebagai ketua, sekretaris, bendahara, atau koordinator seksi.
          </p>
          {!isResident && (
            <Button onClick={onOpenAddMemberModal} size="sm" className="apple-btn-primary">
              <Plus className="h-4 w-4 mr-1" /> Tambah Pengurus Pemuda
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {members.map((m) => {
            const isCore = ['ketua', 'wakil', 'sekretaris', 'bendahara'].includes(m.role);
            return (
              <div
                key={m.id}
                className={`rounded-2xl border p-5 bg-white shadow-sm flex flex-col justify-between transition hover:shadow-md ${
                  m.role === 'ketua'
                    ? 'border-emerald-300 ring-2 ring-emerald-100'
                    : isCore
                    ? 'border-indigo-200'
                    : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <Badge
                      variant={m.role === 'ketua' ? 'default' : 'secondary'}
                      className={m.role === 'ketua' ? 'bg-emerald-700 text-white' : ''}
                    >
                      {m.role.toUpperCase()}
                    </Badge>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        m.status === 'aktif'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>

                  <h4 className="mt-3 text-base font-black text-slate-900 leading-snug">
                    {m.resident_name || 'Nama Warga'}
                  </h4>
                  {m.custom_title && (
                    <p className="text-xs font-semibold text-indigo-600 mt-0.5">{m.custom_title}</p>
                  )}
                  {m.section && (
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <Layers className="h-3 w-3 text-slate-400" /> {m.section}
                    </p>
                  )}
                  {(m.phone_override || m.phone) && (
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                      <Phone className="h-3 w-3 text-slate-400" /> {m.phone_override || m.phone}
                    </p>
                  )}
                </div>

                {!isResident && (
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onOpenEditMemberModal(m)}
                      className="h-8 text-xs font-semibold"
                    >
                      <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteMember(m.id, m.resident_name || 'pengurus')}
                      className="h-8 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Hapus
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
