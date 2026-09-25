import React, { useState } from 'react';
import {
  Calendar,
  CalendarDays,
  ClipboardList,
  MapPin,
  Plus,
  CheckCircle2,
  Clock,
  Users,
  CheckSquare,
  Edit2,
  Trash2,
} from 'lucide-react';
import { PageHeaderTabs } from '../components/ui/PageHeaderTabs';
import { Select } from '../components/ui/select';
import { Dialog } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/table';
import {
  useMeetingsQuery,
  useCreateMeetingMutation,
  useUpdateMeetingMutation,
  useDeleteMeetingMutation,
  useActionItemsQuery,
  useCreateActionItemMutation,
  useUpdateActionItemMutation,
  useDeleteActionItemMutation,
  useAddDecisionMutation,
  useAddAttendeeMutation,
} from '../services/meeting';
import { useAuthStore } from '../store/useAuthStore';
import { Meeting, MeetingActionItem, MeetingAttendee, MeetingDecision, CreateActionItemDTO } from '../types/meeting';

const MEETING_STATUS_LABEL: Record<string, string> = {
  scheduled: 'Akan Datang',
  ongoing: 'Sedang Berlangsung',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

export const MeetingPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin_rt' || user?.role === 'superadmin';

  const [activeTab, setActiveTab] = useState<'meetings' | 'action_items'>('meetings');
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);

  // Modals
  const [isCreateMeetingOpen, setIsCreateMeetingOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [isCreateActionOpen, setIsCreateActionOpen] = useState(false);
  const [editingActionItem, setEditingActionItem] = useState<MeetingActionItem | null>(null);
  const [isAddDecisionOpen, setIsAddDecisionOpen] = useState(false);
  const [isAddAttendeeOpen, setIsAddAttendeeOpen] = useState(false);

  // Form states
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    agenda: '',
    meeting_date: new Date().toISOString().slice(0, 16),
    location: 'Balai Pertemuan Warga',
    meeting_type: 'regular',
    visibility: 'internal',
    status: 'scheduled',
    notes: '',
  });

  const [actionForm, setActionForm] = useState({
    meeting_id: '',
    task: '',
    assignee_name: '',
    due_date: '',
    status: 'pending',
    notes: '',
  });

  const [decisionForm, setDecisionForm] = useState({
    decision_text: '',
    category: 'Umum',
  });

  const [attendeeForm, setAttendeeForm] = useState({
    name: '',
    role_or_title: 'Warga RT',
    attended: true,
    notes: '',
  });

  // Queries & Mutations
  const { data: meetings = [], isLoading: isLoadingMeetings } = useMeetingsQuery();
  const { data: actionItems = [], isLoading: isLoadingActions } = useActionItemsQuery();

  const createMeetingMutation = useCreateMeetingMutation();
  const updateMeetingMutation = useUpdateMeetingMutation();
  const deleteMeetingMutation = useDeleteMeetingMutation();
  const createActionItemMutation = useCreateActionItemMutation();
  const updateActionItemMutation = useUpdateActionItemMutation();
  const deleteActionItemMutation = useDeleteActionItemMutation();
  const addDecisionMutation = useAddDecisionMutation();
  const addAttendeeMutation = useAddAttendeeMutation();

  const handleOpenCreateMeeting = () => {
    setEditingMeeting(null);
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dt = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setMeetingForm({
      title: '',
      agenda: '',
      meeting_date: dt,
      location: 'Balai Pertemuan Warga',
      meeting_type: 'regular',
      visibility: 'internal',
      status: 'scheduled',
      notes: '',
    });
    setIsCreateMeetingOpen(true);
  };

  const handleOpenEditMeeting = (m: Meeting) => {
    setEditingMeeting(m);
    let dt = '';
    if (m.meeting_date) {
      const d = new Date(m.meeting_date);
      const pad = (n: number) => n.toString().padStart(2, '0');
      dt = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } else {
      const d = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      dt = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    setMeetingForm({
      title: m.title || '',
      agenda: m.agenda || '',
      meeting_date: dt,
      location: m.location || 'Balai Pertemuan Warga',
      meeting_type: m.meeting_type || 'regular',
      visibility: m.visibility || 'internal',
      status: m.status || 'scheduled',
      notes: m.notes || '',
    });
    setIsCreateMeetingOpen(true);
  };

  const handleDeleteMeeting = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus arsip rapat ini beserta seluruh notulen dan keputusannya?')) {
      return;
    }
    try {
      await deleteMeetingMutation.mutateAsync(id);
      if (selectedMeetingId === id) {
        setSelectedMeetingId(null);
      }
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus rapat');
    }
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsedDate = new Date(meetingForm.meeting_date);
      const isoDate = isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();

      if (editingMeeting) {
        await updateMeetingMutation.mutateAsync({
          id: editingMeeting.id,
          dto: {
            ...meetingForm,
            meeting_date: isoDate,
          },
        });
      } else {
        await createMeetingMutation.mutateAsync({
          ...meetingForm,
          meeting_date: isoDate,
        });
      }
      setIsCreateMeetingOpen(false);
      setEditingMeeting(null);
      const d = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const dt = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      setMeetingForm({
        title: '',
        agenda: '',
        meeting_date: dt,
        location: 'Balai Pertemuan Warga',
        meeting_type: 'regular',
        visibility: 'internal',
        status: 'scheduled',
        notes: '',
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenCreateActionItem = (meetingId?: string) => {
    setEditingActionItem(null);
    setActionForm({
      meeting_id: meetingId || (meetings.length > 0 ? meetings[0].id : ''),
      task: '',
      assignee_name: '',
      due_date: '',
      status: 'pending',
      notes: '',
    });
    setIsCreateActionOpen(true);
  };

  const handleOpenEditActionItem = (item: MeetingActionItem) => {
    setEditingActionItem(item);
    setActionForm({
      meeting_id: item.meeting_id,
      task: item.task,
      assignee_name: item.assignee_name,
      due_date: item.due_date ? item.due_date.slice(0, 10) : '',
      status: item.status,
      notes: item.notes || '',
    });
    setIsCreateActionOpen(true);
  };

  const handleCreateActionItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetMeetingId = actionForm.meeting_id || (meetings.length > 0 ? meetings[0].id : '');
    const payload: CreateActionItemDTO = {
      meeting_id: targetMeetingId,
      task: actionForm.task,
      assignee_name: actionForm.assignee_name,
      status: actionForm.status || 'pending',
    };
    if (actionForm.due_date && actionForm.due_date.trim() !== '') {
      payload.due_date = actionForm.due_date.trim();
    }
    if (actionForm.notes && actionForm.notes.trim() !== '') {
      payload.notes = actionForm.notes.trim();
    }
    try {
      if (editingActionItem) {
        await updateActionItemMutation.mutateAsync({
          id: editingActionItem.id,
          dto: payload,
        });
      } else {
        await createActionItemMutation.mutateAsync(payload);
      }
      setIsCreateActionOpen(false);
      setEditingActionItem(null);
      setActionForm({
        meeting_id: '',
        task: '',
        assignee_name: '',
        due_date: '',
        status: 'pending',
        notes: '',
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = selectedMeetingId || selectedMeeting?.id;
    if (!targetId) return;
    try {
      await addDecisionMutation.mutateAsync({
        meetingId: targetId,
        dto: decisionForm,
      });
      setIsAddDecisionOpen(false);
      setDecisionForm({ decision_text: '', category: 'Umum' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddAttendee = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = selectedMeetingId || selectedMeeting?.id;
    if (!targetId) return;
    try {
      await addAttendeeMutation.mutateAsync({
        meetingId: targetId,
        dto: attendeeForm,
      });
      setIsAddAttendeeOpen(false);
      setAttendeeForm({
        name: '',
        role_or_title: 'Warga RT',
        attended: true,
        notes: '',
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleActionStatus = async (item: MeetingActionItem) => {
    if (!isAdmin) return;
    const nextStatus = item.status === 'completed' ? 'pending' : 'completed';
    await updateActionItemMutation.mutateAsync({
      id: item.id,
      dto: { status: nextStatus },
    });
  };

  const selectedMeeting = meetings.find((m: Meeting) => m.id === selectedMeetingId) || (meetings.length > 0 ? meetings[0] : null);

  const eventTabs = [
    { to: '/admin/events', label: 'Agenda Kegiatan & RAB', icon: CalendarDays },
    { to: '/admin/meetings', label: 'Notulen & Musyawarah', icon: ClipboardList },
  ];

  return (
    <div className="space-y-6">
      <PageHeaderTabs
        title="Notulen Rapat & Tindak Lanjut"
        description="Kelola agenda kepanitiaan, estimasi anggaran (RAB), RSVP warga, serta risalah musyawarah RT."
        tabs={eventTabs}
        actions={
          isAdmin ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreateActionOpen(true)}
                className="gap-1.5"
              >
                <CheckSquare className="w-4 h-4 text-[#0066cc]" />
                + Tugas Baru
              </Button>
              <Button
                size="sm"
                onClick={handleOpenCreateMeeting}
                className="gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Catat Notulen Baru
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Tabs Navigation */}
      <div className="flex border-b border-[#d2d2d7]">
        <button
          onClick={() => setActiveTab('meetings')}
          className={`py-3 px-6 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
            activeTab === 'meetings'
              ? 'border-[#0071e3] text-[#0071e3]'
              : 'border-transparent text-[#707070] hover:text-[#1d1d1f] hover:border-[#d2d2d7]'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Daftar Rapat & Notulen ({meetings.length})
        </button>
        <button
          onClick={() => setActiveTab('action_items')}
          className={`py-3 px-6 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
            activeTab === 'action_items'
              ? 'border-[#0071e3] text-[#0071e3]'
              : 'border-transparent text-[#707070] hover:text-[#1d1d1f] hover:border-[#d2d2d7]'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          Tracking Tugas Warga ({actionItems.filter((a: MeetingActionItem) => a.status !== 'completed').length} Tertunda)
        </button>
      </div>

      {/* Tab: Meetings */}
      {activeTab === 'meetings' && (
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
              meetings.map((m: Meeting) => (
                <div
                  key={m.id}
                  onClick={() => setSelectedMeetingId(m.id)}
                  className={`p-4 rounded-xl border transition cursor-pointer active:scale-[0.99] ${
                    (selectedMeetingId === m.id || (!selectedMeetingId && selectedMeeting?.id === m.id))
                      ? 'border-[#0071e3] bg-[#f4f8fb] shadow-xs'
                      : 'border-[#d2d2d7] bg-white hover:border-[#858585]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-[#1d1d1f] text-sm">{m.title}</h3>
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold uppercase border ${
                        m.status === 'completed'
                          ? 'bg-[#f4f8fb] text-[#0066cc] border-[#d2d2d7]'
                          : m.status === 'ongoing'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-gray-50 text-[#707070] border-[#d2d2d7]'
                      }`}
                    >
                      {MEETING_STATUS_LABEL[m.status] || m.status}
                    </span>
                  </div>
                  <div className="text-xs text-[#707070] mt-1.5 line-clamp-2">
                    <span className="font-semibold text-[#1d1d1f]">Agenda: </span>
                    {m.agenda}
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-[#707070]">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#0071e3]" />
                      {new Date(m.meeting_date).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#858585]" />
                      {m.location}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Meeting Detail View */}
          <div className="lg:col-span-2">
            {selectedMeeting ? (
              <div className="bg-white border border-[#d2d2d7] rounded-xl p-6 shadow-2xs space-y-6">
                <div className="border-b border-[#d2d2d7] pb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#0066cc] bg-[#f4f8fb] border border-[#d2d2d7] px-2.5 py-0.5 rounded-full">
                      {selectedMeeting.meeting_type} • {selectedMeeting.visibility}
                    </span>
                    <span className="text-xs text-gray-400">
                      ID: {selectedMeeting.id.slice(0, 8)}...
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mt-2">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg sm:text-xl font-bold text-gray-900 break-words">{selectedMeeting.title}</h2>
                      {/* Quick Status Updater */}
                      {isAdmin && (
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="text-xs font-semibold text-slate-500">Ubah Status:</span>
                          <div className="w-40">
                            <Select
                              value={selectedMeeting.status}
                              onValueChange={async (newStatus) => {
                                await updateMeetingMutation.mutateAsync({
                                  id: selectedMeeting.id,
                                  dto: {
                                    title: selectedMeeting.title,
                                    agenda: selectedMeeting.agenda,
                                    meeting_date: selectedMeeting.meeting_date,
                                    location: selectedMeeting.location,
                                    meeting_type: selectedMeeting.meeting_type,
                                    visibility: selectedMeeting.visibility,
                                    status: newStatus,
                                    notes: selectedMeeting.notes || '',
                                  },
                                });
                              }}
                            >
                              <option value="scheduled">Akan Datang</option>
                              <option value="ongoing">Sedang Berlangsung</option>
                              <option value="completed">Selesai</option>
                              <option value="cancelled">Dibatalkan</option>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto pt-1 sm:pt-0">
                        <button
                          onClick={() => handleOpenEditMeeting(selectedMeeting)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition"
                          title="Edit Rapat"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit Rapat</span>
                        </button>
                        <button
                          onClick={() => handleDeleteMeeting(selectedMeeting.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition"
                          title="Hapus Rapat"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <Calendar className="w-4 h-4 text-indigo-600" />
                      {new Date(selectedMeeting.meeting_date).toLocaleString('id-ID', {
                        dateStyle: 'full',
                        timeStyle: 'short',
                      })} WIB
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
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Keputusan Bersama ({selectedMeeting.decisions?.length || 0})
                    </h3>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setSelectedMeetingId(selectedMeeting.id);
                          setIsAddDecisionOpen(true);
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        + Tambah Keputusan
                      </button>
                    )}
                  </div>
                  {selectedMeeting.decisions && selectedMeeting.decisions.length > 0 ? (
                    <div className="space-y-2">
                      {selectedMeeting.decisions.map((d: MeetingDecision, i: number) => (
                        <div key={d.id || i} className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-lg flex items-start gap-2 text-sm text-emerald-950">
                          <span className="font-bold text-emerald-700">{i + 1}.</span>
                          <div className="flex-1">
                            <p>{d.decision_text}</p>
                            <span className="text-[11px] text-emerald-700 font-medium mt-1 inline-block bg-emerald-100/60 px-2 py-0.5 rounded">
                              Kategori: {d.category}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">Belum ada keputusan formal yang dicatat.</p>
                  )}
                </div>

                {/* Attendees Section */}
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-blue-600" />
                      Daftar Kehadiran Warga ({selectedMeeting.attendees?.length || 0})
                    </h3>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setSelectedMeetingId(selectedMeeting.id);
                          setIsAddAttendeeOpen(true);
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        + Tambah Peserta
                      </button>
                    )}
                  </div>
                  {selectedMeeting.attendees && selectedMeeting.attendees.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedMeeting.attendees.map((a: MeetingAttendee, i: number) => (
                        <span key={a.id || i} className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-800 font-medium">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          {a.name} ({a.role_or_title})
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">Belum ada daftar hadir tercatat.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-500">
                Pilih salah satu rapat untuk melihat rincian notulen dan keputusan.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Action Items Tracking */}
      {activeTab === 'action_items' && (
        <div className="bg-white border border-[#d2d2d7] rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#d2d2d7] bg-[#f5f5f7] flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-[#1d1d1f] text-sm">Matriks Tindak Lanjut (*Action Items*)</h2>
              <p className="text-xs text-[#707070]">Tugas yang dibebankan kepada warga atau pengurus dari hasil rapat.</p>
            </div>
            {isAdmin && (
              <Button
                size="sm"
                onClick={() => handleOpenCreateActionItem()}
                className="text-xs h-8"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Tambah Tugas
              </Button>
            )}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Deskripsi Tugas</TableHead>
                <TableHead>Penanggung Jawab (PIC)</TableHead>
                <TableHead>Target Selesai</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingActions ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-[#707070] text-sm">
                    Memuat daftar tugas...
                  </TableCell>
                </TableRow>
              ) : actionItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-[#707070] text-sm">
                    Belum ada tugas tindak lanjut aktif.
                  </TableCell>
                </TableRow>
              ) : (
                actionItems.map((item: MeetingActionItem) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <button
                        onClick={() => handleToggleActionStatus(item)}
                        disabled={!isAdmin}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium transition border ${
                          item.status === 'completed'
                            ? 'bg-[#f4f8fb] text-[#0066cc] border-[#d2d2d7]'
                            : item.status === 'in_progress'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-[#f5f5f7] text-[#707070] border-[#d2d2d7]'
                        }`}
                      >
                        {item.status === 'completed' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#0066cc]" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                        )}
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
                            onClick={() => handleOpenEditActionItem(item)}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Hapus Tugas"
                            onClick={async () => {
                              if (window.confirm(`Hapus tugas "${item.task}"?`)) {
                                await deleteActionItemMutation.mutateAsync(item.id);
                              }
                            }}
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
      )}

      {/* Modal: Create Meeting */}
      <Dialog
        isOpen={isCreateMeetingOpen}
        onClose={() => setIsCreateMeetingOpen(false)}
        title={editingMeeting ? 'Edit Arsip Rapat' : 'Catat Rapat Baru'}
        description="Isi rincian informasi musyawarah atau rapat warga"
      >
        <form onSubmit={handleCreateMeeting} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Judul Rapat</label>
            <Input
              type="text"
              required
              placeholder="Contoh: Rapat Pleno Pemilihan Ketua RT 003"
              value={meetingForm.title}
              onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Agenda & Pembahasan</label>
            <Textarea
              required
              rows={3}
              placeholder="Rincian poin yang dibahas..."
              value={meetingForm.agenda}
              onChange={(e) => setMeetingForm({ ...meetingForm, agenda: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Waktu Rapat</label>
              <Input
                type="datetime-local"
                required
                value={meetingForm.meeting_date}
                onChange={(e) => setMeetingForm({ ...meetingForm, meeting_date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Lokasi</label>
              <Input
                type="text"
                required
                value={meetingForm.location}
                onChange={(e) => setMeetingForm({ ...meetingForm, location: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Tipe Rapat</label>
              <Select
                value={meetingForm.meeting_type}
                onValueChange={(val) => setMeetingForm({ ...meetingForm, meeting_type: val })}
              >
                <option value="regular">Rapat Rutin Bulanan</option>
                <option value="emergency">Rapat Darurat / Luar Biasa</option>
                <option value="karang_taruna">Rapat Pemuda / Karang Taruna</option>
                <option value="rtrw_pleno">Rapat Pleno RT/RW</option>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Visibilitas</label>
              <Select
                value={meetingForm.visibility}
                onValueChange={(val) => setMeetingForm({ ...meetingForm, visibility: val })}
              >
                <option value="internal">Internal Warga</option>
                <option value="public">Publik Transparan</option>
                <option value="confidential">Khusus Pengurus</option>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Status Rapat</label>
            <Select
              value={meetingForm.status}
              onValueChange={(val) => setMeetingForm({ ...meetingForm, status: val })}
            >
              <option value="scheduled">Akan Datang (Scheduled)</option>
              <option value="ongoing">Sedang Berlangsung (Ongoing)</option>
              <option value="completed">Selesai (Completed)</option>
              <option value="cancelled">Dibatalkan (Cancelled)</option>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#d2d2d7]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateMeetingOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={createMeetingMutation.isPending || updateMeetingMutation.isPending}
            >
              {createMeetingMutation.isPending || updateMeetingMutation.isPending
                ? 'Menyimpan...'
                : editingMeeting
                ? 'Simpan Perubahan'
                : 'Simpan Notulen'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal: Create / Edit Action Item */}
      <Dialog
        isOpen={isCreateActionOpen}
        onClose={() => {
          setIsCreateActionOpen(false);
          setEditingActionItem(null);
        }}
        title={editingActionItem ? 'Edit Tugas Tindak Lanjut' : 'Tambah Tugas Tindak Lanjut'}
        description="Tugaskan warga atau pengurus untuk menindaklanjuti hasil rapat"
      >
        <form onSubmit={handleCreateActionItem} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Pilih Rapat Terkait</label>
            <Select
              required
              value={actionForm.meeting_id || (meetings.length > 0 ? meetings[0].id : '')}
              onValueChange={(val) => setActionForm({ ...actionForm, meeting_id: val })}
            >
              {meetings.map((m: Meeting) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Deskripsi Tugas</label>
            <Input
              type="text"
              required
              placeholder="Contoh: Beli cat dan kuas untuk pos ronda"
              value={actionForm.task}
              onChange={(e) => setActionForm({ ...actionForm, task: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Penanggung Jawab (PIC)</label>
            <Input
              type="text"
              required
              placeholder="Nama warga penanggung jawab"
              value={actionForm.assignee_name}
              onChange={(e) => setActionForm({ ...actionForm, assignee_name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Target Selesai (Due Date)</label>
            <Input
              type="date"
              value={actionForm.due_date}
              onChange={(e) => setActionForm({ ...actionForm, due_date: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Status Pengerjaan</label>
            <Select
              value={actionForm.status}
              onValueChange={(val) => setActionForm({ ...actionForm, status: val })}
            >
              <option value="pending">Tertunda (Pending)</option>
              <option value="in_progress">Sedang Dikerjakan (In Progress)</option>
              <option value="completed">Selesai (Completed)</option>
              <option value="cancelled">Dibatalkan (Cancelled)</option>
            </Select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Catatan Tambahan</label>
            <Input
              type="text"
              placeholder="Keterangan tambahan..."
              value={actionForm.notes}
              onChange={(e) => setActionForm({ ...actionForm, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#d2d2d7]">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreateActionOpen(false);
                setEditingActionItem(null);
              }}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={createActionItemMutation.isPending || updateActionItemMutation.isPending}
            >
              {createActionItemMutation.isPending || updateActionItemMutation.isPending
                ? 'Menyimpan...'
                : editingActionItem
                ? 'Simpan Perubahan'
                : 'Simpan Tugas'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal: Add Decision */}
      <Dialog
        isOpen={isAddDecisionOpen}
        onClose={() => setIsAddDecisionOpen(false)}
        title="Tambah Keputusan Bersama"
        description="Catat kesepakatan dan hasil resmi musyawarah"
      >
        <form onSubmit={handleAddDecision} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Isi Keputusan / Kesepakatan</label>
            <Textarea
              required
              rows={3}
              placeholder="Contoh: Iuran sampah disepakati naik menjadi Rp 25.000 mulai bulan depan."
              value={decisionForm.decision_text}
              onChange={(e) => setDecisionForm({ ...decisionForm, decision_text: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Kategori Keputusan</label>
            <Input
              type="text"
              value={decisionForm.category}
              onChange={(e) => setDecisionForm({ ...decisionForm, category: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-[#d2d2d7]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddDecisionOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={addDecisionMutation.isPending}
            >
              Simpan Keputusan
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal: Add Attendee */}
      <Dialog
        isOpen={isAddAttendeeOpen}
        onClose={() => setIsAddAttendeeOpen(false)}
        title="Tambah Peserta Hadir"
        description="Catat daftar kehadiran musyawarah warga"
      >
        <form onSubmit={handleAddAttendee} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Nama Peserta</label>
            <Input
              type="text"
              required
              placeholder="Nama warga"
              value={attendeeForm.name}
              onChange={(e) => setAttendeeForm({ ...attendeeForm, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Peran / Jabatan</label>
            <Input
              type="text"
              value={attendeeForm.role_or_title}
              onChange={(e) => setAttendeeForm({ ...attendeeForm, role_or_title: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-[#d2d2d7]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddAttendeeOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={addAttendeeMutation.isPending}
            >
              Simpan Peserta
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};

export default MeetingPage;
