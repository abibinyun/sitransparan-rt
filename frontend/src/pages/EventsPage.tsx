import React, { useState } from 'react';
import {
  useEvents,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
} from '../services/event';
import { EventItem, EventStatus, CreateEventPayload } from '../types/event';
import { EventBudgetModal } from '../components/EventBudgetModal';
import { EventRSVPModal } from '../components/EventRSVPModal';
import { SimpleDialog } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';

export const EventsPage: React.FC = () => {
  const [filterStatus, setFilterStatus] = useState<string>('');
  const { data, isLoading } = useEvents(filterStatus ? { status: filterStatus } : undefined);

  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);

  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isRSVPModalOpen, setIsRSVPModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<EventStatus>('planned');

  const events = data?.data || [];

  const handleOpenForm = (event?: EventItem) => {
    if (event) {
      setEditingEvent(event);
      setTitle(event.title);
      setDescription(event.description || '');
      setEventDate(event.event_date ? new Date(event.event_date).toISOString().slice(0, 16) : '');
      setLocation(event.location || '');
      setStatus(event.status);
    } else {
      setEditingEvent(null);
      setTitle('');
      setDescription('');
      setEventDate('');
      setLocation('');
      setStatus('planned');
    }
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: CreateEventPayload = {
      title,
      description: description || undefined,
      event_date: eventDate ? new Date(eventDate).toISOString() : undefined,
      location: location || undefined,
      status,
    };

    if (editingEvent) {
      updateEvent.mutate(
        { id: editingEvent.id, payload },
        {
          onSuccess: () => setIsFormModalOpen(false),
        }
      );
    } else {
      createEvent.mutate(payload, {
        onSuccess: () => setIsFormModalOpen(false),
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Daftar Kegiatan RT/RW</h1>
        <Button onClick={() => handleOpenForm()}>
          + Tambah Kegiatan
        </Button>
      </div>

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
                  <p className="text-xs font-medium text-indigo-600">📍 {event.location}</p>
                )}
                {event.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{event.description}</p>
                )}
              </div>

              <div className="pt-2 border-t space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="text-xs"
                    onClick={() => {
                      setSelectedEvent(event);
                      setIsBudgetModalOpen(true);
                    }}
                  >
                    RAB & Budget
                  </Button>

                  <Button
                    variant="outline"
                    className="text-xs"
                    onClick={() => {
                      setSelectedEvent(event);
                      setIsRSVPModalOpen(true);
                    }}
                  >
                    RSVP Kehadiran
                  </Button>
                </div>

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
      />

      {/* Modal RSVP */}
      <EventRSVPModal
        isOpen={isRSVPModalOpen}
        onClose={() => {
          setIsRSVPModalOpen(false);
          setSelectedEvent(null);
        }}
        event={selectedEvent}
      />
    </div>
  );
};
