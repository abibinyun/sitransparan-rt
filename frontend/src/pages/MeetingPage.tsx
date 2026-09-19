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
import {
  useMeetingsQuery,
  useCreateMeetingMutation,
  useUpdateMeetingMutation,
  useDeleteMeetingMutation,
  useActionItemsQuery,
  useCreateActionItemMutation,
  useUpdateActionItemMutation,
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
      await createActionItemMutation.mutateAsync(payload);
      setIsCreateActionOpen(false);
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
              <button
                onClick={() => setIsCreateActionOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition shadow-sm"
              >
                <CheckSquare className="w-4 h-4" />
                + Tugas Baru
              </button>
              <button
                onClick={handleOpenCreateMeeting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Catat Notulen Baru
              </button>
            </div>
          ) : undefined
        }
      />

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('meetings')}
          className={`py-3 px-6 text-sm font-medium border-b-2 flex items-center gap-2 transition ${
            activeTab === 'meetings'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Daftar Rapat & Notulen ({meetings.length})
        </button>
        <button
          onClick={() => setActiveTab('action_items')}
          className={`py-3 px-6 text-sm font-medium border-b-2 flex items-center gap-2 transition ${
            activeTab === 'action_items'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
                  className={`p-4 rounded-xl border transition cursor-pointer ${
                    (selectedMeetingId === m.id || (!selectedMeetingId && selectedMeeting?.id === m.id))
                      ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900 text-sm">{m.title}</h3>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                        m.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : m.status === 'ongoing'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}
                    >
                      {MEETING_STATUS_LABEL[m.status] || m.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1.5 line-clamp-2">
                    <span className="font-semibold text-gray-500">Agenda: </span>
                    {m.agenda}
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(m.meeting_date).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
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
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
                <div className="border-b pb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
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
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-900 text-base">Matriks Tindak Lanjut (*Action Items*)</h2>
              <p className="text-xs text-gray-500">Tugas yang dibebankan kepada warga atau pengurus dari hasil rapat.</p>
            </div>
            {isAdmin && (
              <button
                onClick={() => setIsCreateActionOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Tugas
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs font-semibold border-b">
                <tr>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Deskripsi Tugas</th>
                  <th className="py-3 px-4">Penanggung Jawab (PIC)</th>
                  <th className="py-3 px-4">Target Selesai</th>
                  <th className="py-3 px-4">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoadingActions ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500 text-sm">
                      Memuat daftar tugas...
                    </td>
                  </tr>
                ) : actionItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500 text-sm">
                      Belum ada tugas tindak lanjut aktif.
                    </td>
                  </tr>
                ) : (
                  actionItems.map((item: MeetingActionItem) => (
                    <tr key={item.id} className="hover:bg-gray-50/80 transition">
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleActionStatus(item)}
                          disabled={!isAdmin}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition ${
                            item.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : item.status === 'in_progress'
                              ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {item.status === 'completed' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                          )}
                          {item.status}
                        </button>
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {item.task}
                      </td>
                      <td className="py-3 px-4 text-gray-700 font-medium">
                        {item.assignee_name}
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-xs">
                        {item.due_date || '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-xs">
                        {item.notes || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Create Meeting */}
      {isCreateMeetingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-2xl sm:max-w-3xl w-full p-5 sm:p-7 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900">
              {editingMeeting ? 'Edit Arsip Rapat' : 'Catat Rapat Baru'}
            </h2>
            <form onSubmit={handleCreateMeeting} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Judul Rapat</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Rapat Pleno Pemilihan Ketua RT 003"
                  value={meetingForm.title}
                  onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                  className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Agenda & Pembahasan</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Rincian poin yang dibahas..."
                  value={meetingForm.agenda}
                  onChange={(e) => setMeetingForm({ ...meetingForm, agenda: e.target.value })}
                  className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Waktu Rapat</label>
                  <input
                    type="datetime-local"
                    required
                    value={meetingForm.meeting_date}
                    onChange={(e) => setMeetingForm({ ...meetingForm, meeting_date: e.target.value })}
                    className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Lokasi</label>
                  <input
                    type="text"
                    required
                    value={meetingForm.location}
                    onChange={(e) => setMeetingForm({ ...meetingForm, location: e.target.value })}
                    className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Tipe Rapat</label>
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
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Visibilitas</label>
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
                <label className="block text-xs font-semibold text-gray-700 mb-1">Status Rapat</label>
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

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsCreateMeetingOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createMeetingMutation.isPending || updateMeetingMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-50"
                >
                  {createMeetingMutation.isPending || updateMeetingMutation.isPending
                    ? 'Menyimpan...'
                    : editingMeeting
                    ? 'Simpan Perubahan'
                    : 'Simpan Notulen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Action Item */}
      {isCreateActionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-2xl sm:max-w-3xl w-full p-5 sm:p-7 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900">Tambah Tugas Tindak Lanjut</h2>
            <form onSubmit={handleCreateActionItem} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Pilih Rapat Terkait</label>
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
                <label className="block text-xs font-semibold text-gray-700 mb-1">Deskripsi Tugas</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Beli cat dan kuas untuk pos ronda"
                  value={actionForm.task}
                  onChange={(e) => setActionForm({ ...actionForm, task: e.target.value })}
                  className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Penanggung Jawab (PIC)</label>
                <input
                  type="text"
                  required
                  placeholder="Nama warga penanggung jawab"
                  value={actionForm.assignee_name}
                  onChange={(e) => setActionForm({ ...actionForm, assignee_name: e.target.value })}
                  className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Target Selesai (Due Date)</label>
                <input
                  type="date"
                  value={actionForm.due_date}
                  onChange={(e) => setActionForm({ ...actionForm, due_date: e.target.value })}
                  className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsCreateActionOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createActionItemMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-50"
                >
                  {createActionItemMutation.isPending ? 'Menyimpan...' : 'Simpan Tugas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Decision */}
      {isAddDecisionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-2xl sm:max-w-3xl w-full p-5 sm:p-7 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900">Tambah Keputusan Bersama</h2>
            <form onSubmit={handleAddDecision} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Isi Keputusan / Kesepakatan</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Contoh: Iuran sampah disepakati naik menjadi Rp 25.000 mulai bulan depan."
                  value={decisionForm.decision_text}
                  onChange={(e) => setDecisionForm({ ...decisionForm, decision_text: e.target.value })}
                  className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Kategori Keputusan</label>
                <input
                  type="text"
                  value={decisionForm.category}
                  onChange={(e) => setDecisionForm({ ...decisionForm, category: e.target.value })}
                  className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddDecisionOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={addDecisionMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition"
                >
                  Simpan Keputusan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Attendee */}
      {isAddAttendeeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-2xl sm:max-w-3xl w-full p-5 sm:p-7 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900">Tambah Peserta Hadir</h2>
            <form onSubmit={handleAddAttendee} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Peserta</label>
                <input
                  type="text"
                  required
                  placeholder="Nama warga"
                  value={attendeeForm.name}
                  onChange={(e) => setAttendeeForm({ ...attendeeForm, name: e.target.value })}
                  className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Peran / Jabatan</label>
                <input
                  type="text"
                  value={attendeeForm.role_or_title}
                  onChange={(e) => setAttendeeForm({ ...attendeeForm, role_or_title: e.target.value })}
                  className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddAttendeeOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={addAttendeeMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition"
                >
                  Simpan Peserta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingPage;
