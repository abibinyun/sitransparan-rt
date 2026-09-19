import React, { useState } from 'react';
import {
  useEvents,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  useUploadEventFile,
} from '../services/event';
import { EventItem, EventStatus, CreateEventPayload } from '../types/event';
import { EventBudgetModal } from '../components/EventBudgetModal';
import { SimpleDialog } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { PageHeaderTabs } from '../components/ui/PageHeaderTabs';
import { CalendarDays, ClipboardList, Plus, FileText, ExternalLink } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export const EventsPage: React.FC = () => {
  const { user } = useAuthStore();
  const isResident = String(user?.role || '').toLowerCase() === 'resident';
  const [filterStatus, setFilterStatus] = useState<string>('');
  const { data, isLoading } = useEvents(filterStatus ? { status: filterStatus } : undefined);

  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();
  const uploadFile = useUploadEventFile();

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);

  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [toast, setToast] = useState<string>('');
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<EventStatus>('planned');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [reportUrl, setReportUrl] = useState('');
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isUploadingReport, setIsUploadingReport] = useState(false);

  const events = data?.data || [];

  const handleOpenForm = (event?: EventItem) => {
    if (event) {
      setEditingEvent(event);
      setTitle(event.title);
      setDescription(event.description || '');
      if (event.event_date) {
        const d = new Date(event.event_date);
        const pad = (n: number) => n.toString().padStart(2, '0');
        setEventDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
      } else {
        setEventDate('');
      }
      setLocation(event.location || '');
      setStatus(event.status);
      setAttachmentUrl(event.attachment_url || '');
      setReportUrl(event.report_url || '');
    } else {
      setEditingEvent(null);
      setTitle('');
      setDescription('');
      setEventDate('');
      setLocation('');
      setStatus('planned');
      setAttachmentUrl('');
      setReportUrl('');
    }
    setIsFormModalOpen(true);
  };

  const handleFileUpload = async (file: File, target: 'attachment' | 'report') => {
    try {
      if (target === 'attachment') setIsUploadingAttachment(true);
      else setIsUploadingReport(true);

      const url = await uploadFile.mutateAsync(file);
      if (target === 'attachment') {
        setAttachmentUrl(url);
        showToast('Proposal / TOR berhasil diunggah');
      } else {
        setReportUrl(url);
        showToast('Laporan Pertanggungjawaban (LPJ) berhasil diunggah');
      }
    } catch (err: any) {
      alert('Gagal mengunggah file: ' + (err.response?.data?.error || err.message));
    } finally {
      if (target === 'attachment') setIsUploadingAttachment(false);
      else setIsUploadingReport(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: CreateEventPayload = {
      title,
      description: description || undefined,
      event_date: eventDate ? new Date(eventDate).toISOString() : undefined,
      location: location || undefined,
      status,
      attachment_url: attachmentUrl || undefined,
      report_url: reportUrl || undefined,
    };

    if (editingEvent) {
      updateEvent.mutate(
        { id: editingEvent.id, payload },
        {
          onSuccess: () => {
            setIsFormModalOpen(false);
            showToast('Kegiatan berhasil diperbarui');
          },
        }
      );
    } else {
      createEvent.mutate(payload, {
        onSuccess: () => {
          setIsFormModalOpen(false);
          showToast('Kegiatan berhasil ditambahkan');
        },
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Yakin ingin menghapus kegiatan ini?')) {
      deleteEvent.mutate(id);
    }
  };

  const getStatusBadge = (st: EventStatus) => {
    switch (st) {
      case 'planned':
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800">Rencana</span>;
      case 'ongoing':
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-yellow-100 text-yellow-800">Berlangsung</span>;
      case 'completed':
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800">Selesai</span>;
      case 'cancelled':
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-red-100 text-red-800">Dibatalkan</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-800">{st}</span>;
    }
  };

  const eventTabs = [
    { to: '/admin/events', label: 'Agenda Kegiatan & RAB', icon: CalendarDays },
    { to: '/admin/meetings', label: 'Notulen & Musyawarah', icon: ClipboardList },
  ];

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-xl text-sm font-semibold animate-in fade-in">
          {toast}
        </div>
      )}
      <PageHeaderTabs
        title="Daftar Kegiatan RT/RW"
        description="Kelola agenda kepanitiaan, estimasi anggaran (RAB), RSVP warga, serta risalah musyawarah RT."
        tabs={eventTabs}
        actions={
          !isResident ? (
            <Button onClick={() => handleOpenForm()} className="gap-2">
              <Plus className="h-4 w-4" />
              + Tambah Kegiatan
            </Button>
          ) : undefined
        }
      />

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border flex items-center space-x-4">
        <Label htmlFor="statusFilter" className="text-sm font-medium text-gray-700">Filter Status:</Label>
        <Select
          id="statusFilter"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-48"
        >
          <option value="">Semua Status</option>
          <option value="planned">Rencana (Planned)</option>
          <option value="ongoing">Berlangsung (Ongoing)</option>
          <option value="completed">Selesai (Completed)</option>
          <option value="cancelled">Dibatalkan (Cancelled)</option>
        </Select>
      </div>

      {/* Event List / Grid */}
      {isLoading ? (
        <div className="p-6 text-center text-gray-500">Memuat data kegiatan...</div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
          Belum ada kegiatan RT/RW.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div key={event.id} className="bg-white rounded-lg border shadow-sm p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  {getStatusBadge(event.status)}
                  {event.event_date && (
                    <span className="text-xs text-gray-500">
                      {new Date(event.event_date).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-gray-900">{event.title}</h3>
                {event.location && (
                  <p className="text-xs font-medium text-[#0066cc]">📍 {event.location}</p>
                )}
                {event.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{event.description}</p>
                )}
                {event.budget ? (
                  <div className="mt-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs">
                    <p className="font-semibold text-slate-700">RAB: {event.budget.description || 'Anggaran'}</p>
                    <p className="text-slate-600 tabular-nums">Estimasi Rp {(event.budget.estimated_cost ?? 0).toLocaleString('id-ID')} · Realisasi Rp {(event.budget.actual_cost ?? 0).toLocaleString('id-ID')}</p>
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] text-slate-400">Belum ada RAB</p>
                )}

                {(event.attachment_url || event.report_url) && (
                  <div className="mt-2 space-y-1 text-xs">
                    {event.attachment_url && (
                      <a
                        href={event.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[#0066cc] hover:text-[#0071e3] font-medium"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span className="truncate">Proposal / TOR</span>
                        <ExternalLink className="w-3 h-3 opacity-60 ml-auto shrink-0" />
                      </a>
                    )}
                    {event.report_url && (
                      <a
                        href={event.report_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-emerald-700 hover:text-emerald-900 font-medium"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span className="truncate">LPJ / Pertanggungjawaban</span>
                        <ExternalLink className="w-3 h-3 opacity-60 ml-auto shrink-0" />
                      </a>
                    )}
                  </div>
                )}
              </div>

              {!isResident && (
                <div className="pt-2 border-t space-y-2">
                  <Button
                    variant="outline"
                    className="w-full text-xs"
                    onClick={() => {
                      setSelectedEvent(event);
                      setIsBudgetModalOpen(true);
                    }}
                  >
                    RAB & Budget
                  </Button>

                  <div className="flex justify-end space-x-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => handleOpenForm(event)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="text-xs"
                      onClick={() => handleDelete(event.id)}
                    >
                      Hapus
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Tambah / Edit Kegiatan via Shadcn UI SimpleDialog */}
      <SimpleDialog
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingEvent ? 'Edit Kegiatan' : 'Tambah Kegiatan Baru'}
        description="Kelola jadwal dan agenda kegiatan warga RT/RW"
        className="max-w-3xl"
        preventOutsideClose={true}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="eventTitle">Nama / Judul Kegiatan</Label>
            <Input
              id="eventTitle"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="eventDescription">Deskripsi</Label>
            <Textarea
              id="eventDescription"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="eventDate">Waktu / Tanggal</Label>
            <Input
              id="eventDate"
              type="datetime-local"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="eventLocation">Lokasi</Label>
            <Input
              id="eventLocation"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="eventStatus">Status</Label>
            <Select
              id="eventStatus"
              value={status}
              onChange={(e) => setStatus(e.target.value as EventStatus)}
            >
              <option value="planned">Rencana (Planned)</option>
              <option value="ongoing">Berlangsung (Ongoing)</option>
              <option value="completed">Selesai (Completed)</option>
              <option value="cancelled">Dibatalkan (Cancelled)</option>
            </Select>
          </div>

          {/* Lampiran Proposal / TOR */}
          <div className="space-y-2 border-t pt-3">
            <Label className="text-xs font-semibold text-slate-700">Proposal / TOR (PDF / Gambar maks 5MB)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'attachment');
                }}
                disabled={isUploadingAttachment}
                className="text-xs"
              />
              {isUploadingAttachment && <span className="text-xs text-blue-600 animate-pulse">Mengunggah...</span>}
            </div>
            {attachmentUrl && (
              <div className="flex items-center gap-2 text-xs text-emerald-700">
                <FileText className="w-3.5 h-3.5" />
                <a href={attachmentUrl} target="_blank" rel="noreferrer" className="underline truncate max-w-xs">
                  Proposal terlampir
                </a>
                <button
                  type="button"
                  onClick={() => setAttachmentUrl('')}
                  className="text-red-500 hover:text-red-700 ml-auto"
                >
                  Hapus
                </button>
              </div>
            )}
          </div>

          {/* Lampiran LPJ / Laporan Pertanggungjawaban */}
          <div className="space-y-2 border-t pt-3">
            <Label className="text-xs font-semibold text-slate-700">Laporan Pertanggungjawaban (LPJ)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'report');
                }}
                disabled={isUploadingReport}
                className="text-xs"
              />
              {isUploadingReport && <span className="text-xs text-blue-600 animate-pulse">Mengunggah...</span>}
            </div>
            {reportUrl && (
              <div className="flex items-center gap-2 text-xs text-emerald-700">
                <FileText className="w-3.5 h-3.5" />
                <a href={reportUrl} target="_blank" rel="noreferrer" className="underline truncate max-w-xs">
                  LPJ terlampir
                </a>
                <button
                  type="button"
                  onClick={() => setReportUrl('')}
                  className="text-red-500 hover:text-red-700 ml-auto"
                >
                  Hapus
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsFormModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={createEvent.isPending || updateEvent.isPending}
            >
              {editingEvent ? 'Simpan Perubahan' : 'Tambah'}
            </Button>
          </div>
        </form>
      </SimpleDialog>

      {/* Modal Budget */}
      <EventBudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => {
          setIsBudgetModalOpen(false);
          setSelectedEvent(null);
        }}
        event={selectedEvent}
        onSaved={() => showToast('RAB berhasil disimpan')}
      />
    </div>
  );
};
