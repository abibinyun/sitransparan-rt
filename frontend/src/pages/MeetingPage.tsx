import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  CheckSquare,
  CalendarDays,
  ClipboardList,
} from 'lucide-react';
import {
  useMeetingsQuery,
  useActionItemsQuery,
  useCreateMeetingMutation,
  useUpdateMeetingMutation,
  useDeleteMeetingMutation,
  useCreateActionItemMutation,
  useUpdateActionItemMutation,
  useDeleteActionItemMutation,
  useAddDecisionMutation,
  useAddAttendeeMutation,
} from '../services/meeting';
import { Meeting, MeetingActionItem } from '../types/meeting';
import { Button } from '../components/ui/button';
import { useAuthStore } from '../store/useAuthStore';
import { PageHeaderTabs } from '../components/ui/PageHeaderTabs';

// Modular Components
import { MeetingsTab } from '../components/meetings/MeetingsTab';
import { ActionItemsTab } from '../components/meetings/ActionItemsTab';
import { MeetingFormModal } from '../components/meetings/MeetingFormModal';
import { ActionItemModal } from '../components/meetings/ActionItemModal';
import { DecisionModal } from '../components/meetings/DecisionModal';
import { AttendeeModal } from '../components/meetings/AttendeeModal';

export const MeetingPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'superadmin' || user?.role === 'admin_rt';

  const [activeTab, setActiveTab] = useState<'meetings' | 'action_items'>('meetings');
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('');

  // Modals state
  const [isCreateMeetingOpen, setIsCreateMeetingOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [meetingForm, setMeetingForm] = useState<{
    title: string;
    agenda: string;
    meeting_date: string;
    location: string;
    meeting_type: string;
    visibility: 'public' | 'internal' | 'confidential';
    status: string;
    notes: string;
  }>({
    title: '',
    agenda: '',
    meeting_date: '',
    location: '',
    meeting_type: 'rutin',
    visibility: 'public',
    status: 'scheduled',
    notes: '',
  });

  const [isCreateActionOpen, setIsCreateActionOpen] = useState(false);
  const [editingActionItem, setEditingActionItem] = useState<MeetingActionItem | null>(null);
  const [actionForm, setActionForm] = useState({
    meeting_id: '',
    task: '',
    assignee_name: '',
    due_date: '',
    status: 'pending',
    notes: '',
  });

  const [isAddDecisionOpen, setIsAddDecisionOpen] = useState(false);
  const [decisionForm, setDecisionForm] = useState({
    decision_text: '',
    category: '',
  });

  const [isAddAttendeeOpen, setIsAddAttendeeOpen] = useState(false);
  const [attendeeForm, setAttendeeForm] = useState({
    name: '',
    role_or_title: '',
  });

  // Queries
  const { data: meetings = [], isLoading: isLoadingMeetings } = useMeetingsQuery();
  const { data: actionItems = [], isLoading: isLoadingActionItems } = useActionItemsQuery();

  // Mutations
  const createMeetingMutation = useCreateMeetingMutation();
  const updateMeetingMutation = useUpdateMeetingMutation();
  const deleteMeetingMutation = useDeleteMeetingMutation();
  const createActionItemMutation = useCreateActionItemMutation();
  const updateActionItemMutation = useUpdateActionItemMutation();
  const deleteActionItemMutation = useDeleteActionItemMutation();
  const addDecisionMutation = useAddDecisionMutation();
  const addAttendeeMutation = useAddAttendeeMutation();

  // Handlers - Meeting
  const handleOpenCreateMeeting = () => {
    setEditingMeeting(null);
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setMeetingForm({
      title: '',
      agenda: '',
      meeting_date: localIso,
      location: 'Balai Warga',
      meeting_type: 'rutin',
      visibility: 'public',
      status: 'scheduled',
      notes: '',
    });
    setIsCreateMeetingOpen(true);
  };

  const handleOpenEditMeeting = (m: Meeting) => {
    setEditingMeeting(m);
    const d = new Date(m.meeting_date);
    const pad = (n: number) => String(n).padStart(2, '0');
    const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setMeetingForm({
      title: m.title,
      agenda: m.agenda,
      meeting_date: localIso,
      location: m.location,
      meeting_type: m.meeting_type,
      visibility: m.visibility,
      status: m.status,
      notes: m.notes || '',
    });
    setIsCreateMeetingOpen(true);
  };

  const handleDeleteMeeting = async (id: string) => {
    if (window.confirm('Hapus notulen rapat ini beserta seluruh keputusan dan tindak lanjutnya?')) {
      await deleteMeetingMutation.mutateAsync(id);
      if (selectedMeetingId === id) {
        setSelectedMeetingId('');
      }
    }
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingForm.title || !meetingForm.agenda) return;
    const isoDate = new Date(meetingForm.meeting_date).toISOString();

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
  };

  // Handlers - Action Items
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
    if (!actionForm.task || !actionForm.meeting_id) return;

    if (editingActionItem) {
      await updateActionItemMutation.mutateAsync({
        id: editingActionItem.id,
        dto: {
          meeting_id: actionForm.meeting_id,
          task: actionForm.task,
          assignee_name: actionForm.assignee_name,
          due_date: actionForm.due_date || undefined,
          status: actionForm.status,
          notes: actionForm.notes,
        },
      });
    } else {
      await createActionItemMutation.mutateAsync({
        meeting_id: actionForm.meeting_id,
        task: actionForm.task,
        assignee_name: actionForm.assignee_name,
        due_date: actionForm.due_date || undefined,
        status: actionForm.status,
        notes: actionForm.notes,
      });
    }
    setIsCreateActionOpen(false);
  };

  const handleDeleteActionItem = async (id: string, task: string) => {
    if (window.confirm(`Hapus tugas "${task}"?`)) {
      await deleteActionItemMutation.mutateAsync(id);
    }
  };

  const handleToggleActionStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    await updateActionItemMutation.mutateAsync({
      id,
      dto: { status: nextStatus },
    });
  };

  // Handlers - Decisions
  const handleAddDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    const meetingId = selectedMeeting?.id;
    if (!meetingId || !decisionForm.decision_text) return;

    await addDecisionMutation.mutateAsync({
      meetingId,
      dto: {
        decision_text: decisionForm.decision_text,
        category: decisionForm.category || 'Umum',
      },
    });
    setDecisionForm({ decision_text: '', category: '' });
    setIsAddDecisionOpen(false);
  };

  // Handlers - Attendees
  const handleAddAttendee = async (e: React.FormEvent) => {
    e.preventDefault();
    const meetingId = selectedMeeting?.id;
    if (!meetingId || !attendeeForm.name) return;

    await addAttendeeMutation.mutateAsync({
      meetingId,
      dto: {
        name: attendeeForm.name,
        role_or_title: attendeeForm.role_or_title || 'Warga',
      },
    });
    setAttendeeForm({ name: '', role_or_title: '' });
    setIsAddAttendeeOpen(false);
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
                onClick={() => handleOpenCreateActionItem()}
                className="gap-1.5"
              >
                <CheckSquare className="w-4 h-4 text-[#0066cc]" />
                + Tugas Baru
              </Button>
              <Button
                size="sm"
                onClick={handleOpenCreateMeeting}
                className="gap-1.5 apple-btn-primary"
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
          Daftar Rapat &amp; Notulen ({meetings.length})
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

      {/* Tab 1: Meetings */}
      {activeTab === 'meetings' && (
        <MeetingsTab
          meetings={meetings}
          selectedMeeting={selectedMeeting}
          selectedMeetingId={selectedMeetingId}
          isLoadingMeetings={isLoadingMeetings}
          isAdmin={isAdmin}
          onSelectMeeting={setSelectedMeetingId}
          onStatusChange={async (newStatus) => {
            if (!selectedMeeting) return;
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
          onOpenEditMeeting={handleOpenEditMeeting}
          onDeleteMeeting={handleDeleteMeeting}
          onOpenCreateActionItem={handleOpenCreateActionItem}
          onOpenEditActionItem={handleOpenEditActionItem}
          onDeleteActionItem={handleDeleteActionItem}
          onToggleActionStatus={handleToggleActionStatus}
          onOpenAddDecision={() => setIsAddDecisionOpen(true)}
          onOpenAddAttendee={() => setIsAddAttendeeOpen(true)}
        />
      )}

      {/* Tab 2: Action Items */}
      {activeTab === 'action_items' && (
        <ActionItemsTab
          actionItems={actionItems}
          isLoadingActionItems={isLoadingActionItems}
          isAdmin={isAdmin}
          onToggleStatus={handleToggleActionStatus}
          onOpenCreate={() => handleOpenCreateActionItem()}
          onOpenEdit={handleOpenEditActionItem}
          onDelete={handleDeleteActionItem}
        />
      )}

      {/* Modals */}
      <MeetingFormModal
        isOpen={isCreateMeetingOpen}
        onClose={() => setIsCreateMeetingOpen(false)}
        editingMeeting={editingMeeting}
        form={meetingForm}
        setForm={setMeetingForm}
        onSubmit={handleCreateMeeting}
        isSubmitting={createMeetingMutation.isPending || updateMeetingMutation.isPending}
      />

      <ActionItemModal
        isOpen={isCreateActionOpen}
        onClose={() => {
          setIsCreateActionOpen(false);
          setEditingActionItem(null);
        }}
        editingActionItem={editingActionItem}
        meetings={meetings}
        form={actionForm}
        setForm={setActionForm}
        onSubmit={handleCreateActionItem}
        isSubmitting={createActionItemMutation.isPending || updateActionItemMutation.isPending}
      />

      <DecisionModal
        isOpen={isAddDecisionOpen}
        onClose={() => setIsAddDecisionOpen(false)}
        form={decisionForm}
        setForm={setDecisionForm}
        onSubmit={handleAddDecision}
        isSubmitting={addDecisionMutation.isPending}
      />

      <AttendeeModal
        isOpen={isAddAttendeeOpen}
        onClose={() => setIsAddAttendeeOpen(false)}
        form={attendeeForm}
        setForm={setAttendeeForm}
        onSubmit={handleAddAttendee}
        isSubmitting={addAttendeeMutation.isPending}
      />
    </div>
  );
};

export default MeetingPage;
