import React from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select } from '../ui/select';
import { ShieldCheck, UserCheck, Plus, Edit2, Trash2, Layers, Phone } from 'lucide-react';
import { RTPeriod, RTMember } from '../../services/rt_structure';

interface RTStructureTabProps {
  currentRTPeriod: RTPeriod | null;
  currentRTPeriodId: string;
  rtPeriods: RTPeriod[];
  rtMembers: RTMember[];
  loadingRTMembers: boolean;
  isResident: boolean;
  onSelectPeriod: (id: string) => void;
  onOpenEditPeriodModal: (period: RTPeriod) => void;
  onOpenAddMemberModal: () => void;
  onOpenEditMemberModal: (member: RTMember) => void;
  onDeleteMember: (id: string, name: string) => void;
}

export const RTStructureTab: React.FC<RTStructureTabProps> = ({
  currentRTPeriod,
  currentRTPeriodId,
  rtPeriods,
  rtMembers,
  loadingRTMembers,
  isResident,
  onSelectPeriod,
  onOpenEditPeriodModal,
  onOpenAddMemberModal,
  onOpenEditMemberModal,
  onDeleteMember,
}) => {
  return (
    <div className="space-y-6">
      {/* Period Selector Header on RT Structure */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#d2d2d7] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#f4f8fb] text-[#0071e3] rounded-xl border border-[#d2d2d7]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#707070]">Masa Bakti Pengurus RT</p>
            <h3 className="text-sm font-bold text-[#1d1d1f] flex items-center gap-1.5">
              {currentRTPeriod?.name || 'Belum ada masa bakti aktif'}
              {currentRTPeriod?.status === 'active' && (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
                  Aktif
                </Badge>
              )}
            </h3>
          </div>
        </div>

        {rtPeriods.length > 0 && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Label htmlFor="rtPeriodSelect" className="text-xs text-[#707070] whitespace-nowrap">
              Masa Bakti:
            </Label>
            <Select
              id="rtPeriodSelect"
              value={currentRTPeriodId}
              onChange={(e) => onSelectPeriod(e.target.value)}
              className="text-xs font-semibold bg-white border-[#d2d2d7]"
            >
              {rtPeriods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.status === 'active' ? '(Aktif)' : `(${p.status})`}
                </option>
              ))}
            </Select>
            {!isResident && currentRTPeriod && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenEditPeriodModal(currentRTPeriod)}
                className="h-8 text-xs border-[#d2d2d7]"
                title="Edit masa bakti RT aktif"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>

      {loadingRTMembers ? (
        <div className="p-12 text-center text-[#707070]">Memuat susunan pengurus RT/RW...</div>
      ) : rtMembers.length === 0 ? (
        <Card className="p-12 text-center bg-white border-dashed border-[#d2d2d7]">
          <UserCheck className="h-10 w-10 mx-auto text-[#858585] mb-3" />
          <p className="font-bold text-[#1d1d1f]">Belum ada susunan pengurus RT di periode ini</p>
          <p className="text-xs text-[#707070] mt-1 mb-4">
            Tetapkan Ketua RT, Sekretaris, Bendahara, dan Koordinator Seksi Lingkungan.
          </p>
          {!isResident && (
            <Button onClick={onOpenAddMemberModal} size="sm" className="apple-btn-primary">
              <Plus className="h-4 w-4 mr-1" /> Tetapkan Ketua RT Pertama
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {rtMembers.map((m) => {
            const isCore = ['ketua', 'wakil', 'sekretaris', 'bendahara'].includes(m.role);
            return (
              <Card
                key={m.id}
                className={`p-5 flex flex-col justify-between transition hover:border-[#0071e3] ${
                  m.role === 'ketua'
                    ? 'border-[#0071e3] ring-1 ring-[#0071e3] bg-[#f4f8fb]/40'
                    : isCore
                    ? 'border-[#d2d2d7]'
                    : 'border-[#d2d2d7]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <Badge
                      variant="outline"
                      className={
                        m.role === 'ketua'
                          ? 'bg-[#0071e3] text-white border-transparent'
                          : 'bg-[#f5f5f7] text-[#1d1d1f] border-[#d2d2d7]'
                      }
                    >
                      {m.role.toUpperCase()}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        m.status === 'aktif'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-[#f5f5f7] text-[#707070] border-[#d2d2d7]'
                      }`}
                    >
                      {m.status}
                    </Badge>
                  </div>

                  <h4 className="mt-3 text-base font-bold text-[#1d1d1f] leading-snug">
                    {m.resident_name || 'Nama Warga'}
                  </h4>
                  {m.custom_title && (
                    <p className="text-xs font-semibold text-[#0066cc] mt-0.5">{m.custom_title}</p>
                  )}
                  {m.section && (
                    <p className="text-xs text-[#707070] mt-1 flex items-center gap-1">
                      <Layers className="h-3 w-3 text-[#0071e3]" /> {m.section}
                    </p>
                  )}
                  {(m.phone_override || m.phone) && (
                    <p className="text-xs text-[#707070] mt-1 flex items-center gap-1">
                      <Phone className="h-3 w-3 text-[#858585]" /> {m.phone_override || m.phone}
                    </p>
                  )}
                </div>

                {!isResident && (
                  <div className="mt-4 pt-3 border-t border-[#e2e2e5] flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onOpenEditMemberModal(m)}
                      className="h-8 text-xs font-semibold text-[#707070] hover:text-[#1d1d1f]"
                    >
                      <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteMember(m.id, m.resident_name || 'pengurus')}
                      className="h-8 text-xs font-semibold text-rose-600 hover:text-rose-800"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
