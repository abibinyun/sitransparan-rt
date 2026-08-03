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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Daftar Kegiatan RT/RW</h1>
        <button
          onClick={() => handleOpenForm()}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm"
        >
          + Tambah Kegiatan
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center space-x-4 bg-white p-4 rounded-lg shadow-sm">
        <label className="text-sm font-medium text-gray-700">Filter Status:</label>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
        >
          <option value="">Semua Status</option>
          <option value="planned">Rencana (Planned)</option>
          <option value="ongoing">Berlangsung (Ongoing)</option>
          <option value="completed">Selesai (Completed)</option>
          <option value="cancelled">Dibatalkan (Cancelled)</option>
        </select>
      </div>

      {/* List */}
      {isLoading ? (
        <p className="text-gray-500">Memuat data kegiatan...</p>
      ) : events.length === 0 ? (
        <div className="bg-white p-6 rounded-lg text-center text-gray-500 shadow-sm">
          Belum ada kegiatan RT/RW.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((evt) => (
            <div key={evt.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-gray-900">{evt.title}</h3>
                  {getStatusBadge(evt.status)}
                </div>
                <p className="text-sm text-gray-600 mb-4">{evt.description || 'Tidak ada deskripsi.'}</p>
                <div className="text-xs text-gray-500 space-y-1 mb-4">
                  <div>
                    <span className="font-semibold">Tanggal:</span>{' '}
                    {evt.event_date ? new Date(evt.event_date).toLocaleString('id-ID') : '-'}
                  </div>
                  <div>
                    <span className="font-semibold">Lokasi:</span> {evt.location || '-'}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex flex-wrap gap-2 justify-between items-center">
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setSelectedEvent(evt);
                      setIsBudgetModalOpen(true);
                    }}
                    className="px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200"
                  >
                    Anggaran
                  </button>
                  <button
                    onClick={() => {
                      setSelectedEvent(evt);
                      setIsRSVPModalOpen(true);
                    }}
                    className="px-2.5 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded border border-green-200"
                  >
                    RSVP Warga
                  </button>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleOpenForm(evt)}
                    className="px-2 py-1 text-xs font-medium text-gray-700 hover:text-indigo-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(evt.id)}
                    className="px-2 py-1 text-xs font-medium text-red-600 hover:text-red-800"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Tambah / Edit Kegiatan */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">
              {editingEvent ? 'Edit Kegiatan' : 'Tambah Kegiatan Baru'}
            </h2>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nama / Judul Kegiatan</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Deskripsi</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Waktu / Tanggal</label>
                <input
                  type="datetime-local"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Lokasi</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as EventStatus)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                >
                  <option value="planned">Rencana (Planned)</option>
                  <option value="ongoing">Berlangsung (Ongoing)</option>
                  <option value="completed">Selesai (Completed)</option>
                  <option value="cancelled">Dibatalkan (Cancelled)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createEvent.isPending || updateEvent.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50"
                >
                  {editingEvent ? 'Simpan Perubahan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
