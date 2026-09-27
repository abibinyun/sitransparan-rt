import React from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Select } from '../ui/select';
import {
  Calendar,
  MapPin,
  Clock,
  Plus,
  CheckCircle,
  Users,
  Edit2,
  Trash2,
  Lock,
  Globe,
  Shield,
  FileCheck,
} from 'lucide-react';
import { Meeting, MeetingActionItem, MeetingDecision, MeetingAttendee } from '../../types/meeting';

interface MeetingsTabProps {
  meetings: Meeting[];
  selectedMeeting: Meeting | null;
  selectedMeetingId: string;
  isLoadingMeetings: boolean;
  isAdmin: boolean;
  onSelectMeeting: (id: string) => void;
  onStatusChange: (status: string) => Promise<void>;
  onOpenEditMeeting: (meeting: Meeting) => void;
  onDeleteMeeting: (id: string) => void;
  onOpenCreateActionItem: (meetingId: string) => void;
  onOpenEditActionItem: (item: MeetingActionItem) => void;
  onDeleteActionItem: (id: string, task: string) => void;
  onToggleActionStatus: (id: string, currentStatus: string) => void;
  onOpenAddDecision: () => void;
  onOpenAddAttendee: () => void;
}

export const MeetingsTab: React.FC<MeetingsTabProps> = ({
  meetings,
  selectedMeeting,
  selectedMeetingId,
  isLoadingMeetings,
  isAdmin,
  onSelectMeeting,
  onStatusChange,
  onOpenEditMeeting,
  onDeleteMeeting,
  onOpenCreateActionItem,
  onOpenEditActionItem,
  onDeleteActionItem,
  onToggleActionStatus,
  onOpenAddDecision,
  onOpenAddAttendee,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* List of Meetings */}
      <div className="lg:col-span-1 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Arsip Rapat Lingkungan</h2>
        {isLoadingMeetings ? (
          <div className="p-8 text-center text-gray-500">Memuat data rapat...</div>
        ) : meetings.length === 0 ? (
          <div className="p-8 text-center bg-gray-50 border border-dashed rounded-xl text-gray-500 text-sm">
            Belum ada notulen rapat tercatat.
          </div>
        ) : (
          <div className="space-y-2">
            {meetings.map((m: Meeting) => {
              const isSelected = m.id === (selectedMeeting?.id || selectedMeetingId);
              return (
                <div
                  key={m.id}
                  onClick={() => onSelectMeeting(m.id)}
                  className={`p-4 rounded-xl border transition cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/50 border-[#0071e3] shadow-sm'
                      : 'bg-white border-[#d2d2d7] hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                        m.visibility === 'public'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : m.visibility === 'confidential'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {m.visibility === 'public' ? (
                        <span className="flex items-center gap-1">
                          <Globe className="w-2.5 h-2.5" /> Publik
                        </span>
                      ) : m.visibility === 'confidential' ? (
                        <span className="flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> Rahasia
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Shield className="w-2.5 h-2.5" /> Internal
                        </span>
                      )}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        m.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : m.status === 'ongoing'
                          ? 'bg-blue-100 text-blue-800'
                          : m.status === 'cancelled'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {m.status.toUpperCase()}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-[#1d1d1f] mt-2 line-clamp-1">{m.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-[#707070] mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(m.meeting_date).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="flex items-center gap-1 truncate max-w-[120px]">
                      <MapPin className="w-3.5 h-3.5" />
                      {m.location}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Meeting Detail & Notes */}
      <div className="lg:col-span-2">
        {selectedMeeting ? (
          <Card className="p-6 bg-white border-[#d2d2d7] shadow-xs space-y-6">
            <div>
              <div className="flex flex-col sm:flex-row items-start justify-between gap-3 pb-3 border-b border-[#d2d2d7]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase ${
                        selectedMeeting.visibility === 'public'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : selectedMeeting.visibility === 'confidential'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {selectedMeeting.visibility}
                    </span>
                    <span className="text-xs text-[#707070] uppercase font-mono">
                      {selectedMeeting.meeting_type}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-[#1d1d1f] leading-snug">{selectedMeeting.title}</h2>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto pt-1 sm:pt-0">
                    <button
                      onClick={() => onOpenEditMeeting(selectedMeeting)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition"
                      title="Edit Rapat"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Rapat</span>
                    </button>
                    <button
                      onClick={() => onDeleteMeeting(selectedMeeting.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition"
                      title="Hapus Rapat"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Status Select */}
              {isAdmin && (
                <div className="flex items-center gap-2 mt-3 text-xs">
                  <span className="font-semibold text-gray-600">Status Pelaksanaan:</span>
                  <div className="w-44">
                    <Select
                      value={selectedMeeting.status}
                      onValueChange={onStatusChange}
                    >
                      <option value="scheduled">Akan Datang</option>
                      <option value="ongoing">Sedang Berlangsung</option>
                      <option value="completed">Selesai</option>
                      <option value="cancelled">Dibatalkan</option>
                    </Select>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
                <span className="flex items-center gap-1 font-medium text-slate-700">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  {new Date(selectedMeeting.meeting_date).toLocaleString('id-ID', {
                    dateStyle: 'full',
                    timeStyle: 'short',
                  })}{' '}
                  WIB
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  {selectedMeeting.location}
                </span>
              </div>
            </div>

            {/* Agenda & Notes */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-800">Agenda & Poin Bahasan</h3>
              <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
                {selectedMeeting.agenda}
              </div>
              {selectedMeeting.notes && (
                <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-lg text-sm text-amber-900 whitespace-pre-wrap">
                  <span className="font-semibold block mb-1">Catatan Tambahan:</span>
                  {selectedMeeting.notes}
                </div>
              )}
            </div>

            {/* Decisions Section */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-emerald-600" /> Keputusan & Kesepakatan Bersama
                </h3>
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onOpenAddDecision}
                    className="h-7 text-xs"
                  >
                    + Tambah Keputusan
                  </Button>
                )}
              </div>
              {!selectedMeeting.decisions || selectedMeeting.decisions.length === 0 ? (
                <div className="text-xs text-gray-500 italic p-3 bg-gray-50 rounded-lg">
                  Belum ada kesepakatan tertulis yang dicatat.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedMeeting.decisions.map((d: MeetingDecision) => (
                    <div
                      key={d.id}
                      className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-lg flex items-start justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-medium text-slate-800 leading-relaxed">{d.decision_text}</div>
                        {d.category && (
                          <span className="inline-block mt-1 text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100/60 px-1.5 py-0.5 rounded">
                            {d.category}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Items for This Meeting */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-indigo-600" /> Tindak Lanjut & Tugas (Action Items)
                </h3>
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onOpenCreateActionItem(selectedMeeting.id)}
                    className="h-7 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Tugas Baru
                  </Button>
                )}
              </div>
              {!selectedMeeting.action_items || selectedMeeting.action_items.length === 0 ? (
                <div className="text-xs text-gray-500 italic p-3 bg-gray-50 rounded-lg">
                  Tidak ada penugasan atau tindak lanjut khusus.
                </div>
              ) : (
                <div className="divide-y divide-gray-100 border rounded-lg bg-white overflow-hidden text-xs">
                  {selectedMeeting.action_items.map((item: MeetingActionItem) => (
                    <div
                      key={item.id}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-gray-50/60 transition"
                    >
                      <div className="flex items-start gap-2.5">
                        <button
                          disabled={!isAdmin}
                          onClick={() => onToggleActionStatus(item.id, item.status)}
                          className={`mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase transition ${
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
                        <div>
                          <div
                            className={`font-semibold text-slate-800 ${
                              item.status === 'completed' ? 'line-through text-slate-400' : ''
                            }`}
                          >
                            {item.task}
                          </div>
                          <div className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
                            <span>PIC: {item.assignee_name}</span>
                            {item.due_date && <span>· Target: {item.due_date}</span>}
                          </div>
                        </div>
                      </div>

                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onOpenEditActionItem(item)}
                            className="text-gray-400 hover:text-indigo-600 p-1"
                            title="Edit Tugas"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteActionItem(item.id, item.task)}
                            className="text-gray-400 hover:text-rose-600 p-1"
                            title="Hapus Tugas"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Attendees Section */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-slate-600" /> Daftar Hadir Peserta
                </h3>
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onOpenAddAttendee}
                    className="h-7 text-xs"
                  >
                    + Tambah Peserta
                  </Button>
                )}
              </div>
              {!selectedMeeting.attendees || selectedMeeting.attendees.length === 0 ? (
                <div className="text-xs text-gray-500 italic p-3 bg-gray-50 rounded-lg">
                  Daftar absensi kehadiran belum dicatat secara digital.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedMeeting.attendees.map((att: MeetingAttendee) => (
                    <span
                      key={att.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs text-slate-700"
                    >
                      <span className="font-semibold text-slate-800">{att.name}</span>
                      {att.role_or_title && (
                        <span className="text-[10px] text-slate-500">({att.role_or_title})</span>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Card>
        ) : (
          <div className="p-12 text-center bg-gray-50 border border-dashed rounded-xl text-gray-500 text-sm">
            Pilih rapat di sebelah kiri untuk melihat notulen dan tindak lanjut lengkap.
          </div>
        )}
      </div>
    </div>
  );
};
