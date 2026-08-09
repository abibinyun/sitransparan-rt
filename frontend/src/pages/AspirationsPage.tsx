import React, { useState } from 'react';
import {
  useAspirations,
  useCommunityNeeds,
  useUpdateAspirationStatus,
  useCreateCommunityNeed,
  useUpdateCommunityNeed,
  useSubmitAspiration,
} from '../services/aspiration_need';
import { AspirationFormModal } from '../components/AspirationFormModal';
import {
  Aspiration,
  AspirationStatus,
  CommunityNeed,
  CommunityNeedStatus,
  CreateAspirationPayload,
} from '../types/aspiration_need';
import { SimpleDialog } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';

export const AspirationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'aspirations' | 'needs'>('aspirations');
  const [showAspirationModal, setShowAspirationModal] = useState(false);

  // Status update response state for aspirations
  const [selectedAspiration, setSelectedAspiration] = useState<Aspiration | null>(null);
  const [newStatus, setNewStatus] = useState<AspirationStatus>('submitted');
  const [responseMessage, setResponseMessage] = useState('');

  // Community Need Form State
  const [showNeedModal, setShowNeedModal] = useState(false);
  const [editingNeed, setEditingNeed] = useState<CommunityNeed | null>(null);
  const [needTitle, setNeedTitle] = useState('');
  const [needDescription, setNeedDescription] = useState('');
  const [needEstimatedCost, setNeedEstimatedCost] = useState<number>(0);
  const [needStatus, setNeedStatus] = useState<CommunityNeedStatus>('proposed');
  const [needProgressNotes, setNeedProgressNotes] = useState('');

  const { data: aspirationsData, isLoading: loadingAspirations } = useAspirations();
  const { data: needsData, isLoading: loadingNeeds } = useCommunityNeeds();

  const submitAspirationMutation = useSubmitAspiration();
  const updateAspirationStatusMutation = useUpdateAspirationStatus();
  const createNeedMutation = useCreateCommunityNeed();
  const updateNeedMutation = useUpdateCommunityNeed();

  const handleCreateAspiration = async (payload: CreateAspirationPayload) => {
    await submitAspirationMutation.mutateAsync(payload);
  };

  const handleOpenResponseModal = (item: Aspiration) => {
    setSelectedAspiration(item);
    setNewStatus(item.status);
    setResponseMessage(item.response || '');
  };

  const handleSaveAspirationResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAspiration) return;
    await updateAspirationStatusMutation.mutateAsync({
      id: selectedAspiration.id,
      payload: {
        status: newStatus,
        response: responseMessage,
      },
    });
    setSelectedAspiration(null);
  };

  const handleOpenNeedModal = (need?: CommunityNeed) => {
    if (need) {
      setEditingNeed(need);
      setNeedTitle(need.title);
      setNeedDescription(need.description || '');
      setNeedEstimatedCost(need.estimated_cost);
      setNeedStatus(need.status);
      setNeedProgressNotes(need.progress_notes || '');
    } else {
      setEditingNeed(null);
      setNeedTitle('');
      setNeedDescription('');
      setNeedEstimatedCost(0);
      setNeedStatus('proposed');
      setNeedProgressNotes('');
    }
    setShowNeedModal(true);
  };

  const handleSaveNeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!needTitle.trim()) return;

    if (editingNeed) {
      await updateNeedMutation.mutateAsync({
        id: editingNeed.id,
        payload: {
          title: needTitle,
          description: needDescription,
          estimated_cost: Number(needEstimatedCost),
          status: needStatus,
          progress_notes: needProgressNotes,
        },
      });
    } else {
      await createNeedMutation.mutateAsync({
        title: needTitle,
        description: needDescription,
        estimated_cost: Number(needEstimatedCost),
        status: needStatus,
        progress_notes: needProgressNotes,
      });
    }
    setShowNeedModal(false);
  };

  const aspirations = aspirationsData?.data || [];
  const communityNeeds = needsData?.data || [];

  const getAspirationStatusBadge = (st: AspirationStatus) => {
    switch (st) {
      case 'submitted':
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-amber-100 text-amber-800">Terkirim</span>;
      case 'under_review':
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800">Peninjauan</span>;
      case 'resolved':
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-emerald-100 text-emerald-800">Selesai</span>;
      case 'rejected':
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-rose-100 text-rose-800">Ditolak</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-800">{st}</span>;
    }
  };

  const getNeedStatusBadge = (st: CommunityNeedStatus) => {
    switch (st) {
      case 'proposed':
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-purple-100 text-purple-800">Diusulkan</span>;
      case 'approved':
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800">Disetujui</span>;
      case 'in_progress':
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-amber-100 text-amber-800">Dikerjakan</span>;
      case 'completed':
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-emerald-100 text-emerald-800">Selesai</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-800">{st}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Manajemen Aspirasi & Kebutuhan Lingkungan
          </h1>
          <p className="text-sm text-slate-500">
            Kelola tanggapan aspirasi warga dan daftar kebutuhan lingkungan RT/RW
          </p>
        </div>
        {activeTab === 'aspirations' ? (
          <Button onClick={() => setShowAspirationModal(true)}>
            + Tambah Aspirasi
          </Button>
        ) : (
          <Button onClick={() => handleOpenNeedModal()}>
            + Tambah Kebutuhan Lingkungan
          </Button>
        )}
      </div>

      {/* Tabs Switcher */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('aspirations')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'aspirations'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Aspirasi Warga
          </button>
          <button
            onClick={() => setActiveTab('needs')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'needs'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Kebutuhan Lingkungan
          </button>
        </nav>
      </div>

      {activeTab === 'aspirations' ? (
        <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
          {loadingAspirations ? (
            <div className="p-6 text-sm text-slate-500">Memuat aspirasi...</div>
          ) : aspirations.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">Belum ada aspirasi warga.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {aspirations.map((item) => (
                <div key={item.id} className="p-6 hover:bg-slate-50/50 transition-colors space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                          {item.category || 'Umum'}
                        </span>
                        <span>•</span>
                        {getAspirationStatusBadge(item.status as any)}
                      </div>
                      <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenResponseModal(item)}
                    >
                      Tanggapi
                    </Button>
                  </div>
                  <p className="text-sm text-slate-600">{item.content || (item as any).description || ''}</p>
                  {item.response && (
                    <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 space-y-1">
                      <p className="font-semibold text-slate-900">Tanggapan Pengurus:</p>
                      <p>{item.response}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loadingNeeds ? (
            <div className="p-6 text-sm text-slate-500 col-span-full">Memuat kebutuhan...</div>
          ) : communityNeeds.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 col-span-full bg-white rounded-xl border border-slate-200">
              Belum ada usulan kebutuhan lingkungan.
            </div>
          ) : (
            communityNeeds.map((need) => (
              <div key={need.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    {getNeedStatusBadge(need.status)}
                    <span className="text-sm font-bold text-slate-900">
                      Rp {need.estimated_cost.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{need.title}</h3>
                  <p className="text-sm text-slate-600 line-clamp-3">{need.description}</p>
                  {need.progress_notes && (
                    <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
                      <strong>Progres:</strong> {need.progress_notes}
                    </p>
                  )}
                </div>
                <div className="pt-2">
                  <Button
                    variant="outline"
                    className="w-full text-xs"
                    onClick={() => handleOpenNeedModal(need)}
                  >
                    Edit / Update Status
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal Aspiration Form */}
      {showAspirationModal && (
        <AspirationFormModal
          onSubmit={handleCreateAspiration}
          isLoading={submitAspirationMutation.isPending}
          onClose={() => setShowAspirationModal(false)}
        />
      )}

      {/* Modal Tanggapi Aspirasi via Shadcn UI SimpleDialog */}
      <SimpleDialog
        isOpen={!!selectedAspiration}
        onClose={() => setSelectedAspiration(null)}
        title="Tanggapi Aspirasi Warga"
        description={selectedAspiration?.title}
      >
        <form onSubmit={handleSaveAspirationResponse} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="aspirationStatus">Status</Label>
            <Select
              id="aspirationStatus"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as AspirationStatus)}
            >
              <option value="submitted">Terkirim</option>
              <option value="under_review">Proses Peninjauan</option>
              <option value="resolved">Selesai / Ditindaklanjuti</option>
              <option value="rejected">Ditolak</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="aspirationResponse">Tanggapan / Catatan Admin</Label>
            <Textarea
              id="aspirationResponse"
              rows={4}
              value={responseMessage}
              onChange={(e) => setResponseMessage(e.target.value)}
              placeholder="Masukkan tanggapan resmi pengurus RT..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedAspiration(null)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={updateAspirationStatusMutation.isPending}
            >
              {updateAspirationStatusMutation.isPending ? 'Menyimpan...' : 'Simpan Tanggapan'}
            </Button>
          </div>
        </form>
      </SimpleDialog>

      {/* Modal Form Kebutuhan Lingkungan via Shadcn UI SimpleDialog */}
      <SimpleDialog
        isOpen={showNeedModal}
        onClose={() => setShowNeedModal(false)}
        title={editingNeed ? 'Edit Kebutuhan Lingkungan' : 'Tambah Kebutuhan Lingkungan'}
        description="Kelola usulan dan progres kebutuhan fasilitas lingkungan RT/RW"
      >
        <form onSubmit={handleSaveNeed} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="needTitle">Judul Kebutuhan</Label>
            <Input
              id="needTitle"
              type="text"
              required
              value={needTitle}
              onChange={(e) => setNeedTitle(e.target.value)}
              placeholder="Misal: Perbaikan lampu jalan RT 02"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="needDescription">Deskripsi</Label>
            <Textarea
              id="needDescription"
              rows={3}
              value={needDescription}
              onChange={(e) => setNeedDescription(e.target.value)}
              placeholder="Penjelasan detail kebutuhan..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="needEstimatedCost">Estimasi Biaya (Rp)</Label>
            <Input
              id="needEstimatedCost"
              type="number"
              min="0"
              value={needEstimatedCost}
              onChange={(e) => setNeedEstimatedCost(Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="needStatus">Status</Label>
            <Select
              id="needStatus"
              value={needStatus}
              onChange={(e) => setNeedStatus(e.target.value as CommunityNeedStatus)}
            >
              <option value="proposed">Diusulkan</option>
              <option value="approved">Disetujui</option>
              <option value="in_progress">Sedang Dikerjakan</option>
              <option value="completed">Selesai</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="needProgressNotes">Catatan Progres</Label>
            <Input
              id="needProgressNotes"
              type="text"
              value={needProgressNotes}
              onChange={(e) => setNeedProgressNotes(e.target.value)}
              placeholder="Misal: Sudah dibeli material..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowNeedModal(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={createNeedMutation.isPending || updateNeedMutation.isPending}
            >
              Simpan
            </Button>
          </div>
        </form>
      </SimpleDialog>
    </div>
  );
};
