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

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'suggestion':
        return <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">Usulan</span>;
      case 'complaint':
        return <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-800">Keluhan</span>;
      case 'question':
        return <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">Pertanyaan</span>;
      default:
        return <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-800">{cat}</span>;
    }
  };

  const getAspirationStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-800">Terkirim</span>;
      case 'under_review':
        return <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">Proses Peninjauan</span>;
      case 'resolved':
        return <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">Selesai</span>;
      case 'rejected':
        return <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-800">Ditolak</span>;
      default:
        return <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-800">{status}</span>;
    }
  };

  const getNeedStatusBadge = (status: string) => {
    switch (status) {
      case 'proposed':
        return <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-800">Diusulkan</span>;
      case 'approved':
        return <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">Disetujui</span>;
      case 'in_progress':
        return <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">Sedang Dikerjakan</span>;
      case 'completed':
        return <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">Selesai</span>;
      default:
        return <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-800">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Aspirasi & Kebutuhan Lingkungan</h1>
          <p className="text-sm text-gray-600">Kelola tanggapan aspirasi warga dan daftar kebutuhan lingkungan RT/RW</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'aspirations' ? (
            <button
              onClick={() => setShowAspirationModal(true)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700"
            >
              + Tambah Aspirasi
            </button>
          ) : (
            <button
              onClick={() => handleOpenNeedModal()}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700"
            >
              + Tambah Kebutuhan Lingkungan
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('aspirations')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'aspirations'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Aspirasi Warga
          </button>
          <button
            onClick={() => setActiveTab('needs')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'needs'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Kebutuhan Lingkungan
          </button>
        </nav>
      </div>

      {/* Aspirations Tab */}
      {activeTab === 'aspirations' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loadingAspirations ? (
            <div className="p-6 text-gray-500 text-sm">Memuat data...</div>
          ) : !aspirationsData?.data || aspirationsData.data.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">Belum ada aspirasi warga.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Judul & Isi</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pengirim</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {aspirationsData.data.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{item.title}</div>
                      <div className="text-sm text-gray-600 line-clamp-2">{item.content}</div>
                      {item.response && (
                        <div className="mt-1 text-xs text-blue-700 bg-blue-50 p-2 rounded">
                          <span className="font-medium">Tanggapan:</span> {item.response}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getCategoryBadge(item.category)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.is_anonymous ? 'Anonim' : 'Warga'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getAspirationStatusBadge(item.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleOpenResponseModal(item)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Tanggapi / Ubah Status
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Community Needs Tab */}
      {activeTab === 'needs' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loadingNeeds ? (
            <div className="p-6 text-gray-500 text-sm">Memuat data...</div>
          ) : !needsData?.data || needsData.data.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">Belum ada kebutuhan lingkungan.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kebutuhan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estimasi Biaya</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progres</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {needsData.data.map((need) => (
                  <tr key={need.id}>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{need.title}</div>
                      {need.description && <div className="text-sm text-gray-500">{need.description}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Rp {need.estimated_cost.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getNeedStatusBadge(need.status)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {need.progress_notes || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleOpenNeedModal(need)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

      {/* Modal Tanggapi Aspirasi */}
      {selectedAspiration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 className="text-xl font-bold mb-2 text-gray-800">Tanggapi Aspirasi Warga</h2>
            <p className="text-sm font-medium text-gray-700 mb-4">{selectedAspiration.title}</p>
            <form onSubmit={handleSaveAspirationResponse} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as AspirationStatus)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="submitted">Terkirim</option>
                  <option value="under_review">Proses Peninjauan</option>
                  <option value="resolved">Selesai / Ditindaklanjuti</option>
                  <option value="rejected">Ditolak</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Tanggapan / Catatan Admin</label>
                <textarea
                  rows={4}
                  value={responseMessage}
                  onChange={(e) => setResponseMessage(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Masukkan tanggapan resmi pengurus RT..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedAspiration(null)}
                  className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updateAspirationStatusMutation.isPending}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {updateAspirationStatusMutation.isPending ? 'Menyimpan...' : 'Simpan Tanggapan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Form Kebutuhan Lingkungan */}
      {showNeedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-gray-800">
              {editingNeed ? 'Edit Kebutuhan Lingkungan' : 'Tambah Kebutuhan Lingkungan'}
            </h2>
            <form onSubmit={handleSaveNeed} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Judul Kebutuhan</label>
                <input
                  type="text"
                  required
                  value={needTitle}
                  onChange={(e) => setNeedTitle(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Misal: Perbaikan lampu jalan RT 02"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Deskripsi</label>
                <textarea
                  rows={3}
                  value={needDescription}
                  onChange={(e) => setNeedDescription(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Penjelasan detail kebutuhan..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Estimasi Biaya (Rp)</label>
                <input
                  type="number"
                  min="0"
                  value={needEstimatedCost}
                  onChange={(e) => setNeedEstimatedCost(Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={needStatus}
                  onChange={(e) => setNeedStatus(e.target.value as CommunityNeedStatus)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="proposed">Diusulkan</option>
                  <option value="approved">Disetujui</option>
                  <option value="in_progress">Sedang Dikerjakan</option>
                  <option value="completed">Selesai</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Catatan Progres</label>
                <input
                  type="text"
                  value={needProgressNotes}
                  onChange={(e) => setNeedProgressNotes(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Misal: Sudah dibeli material..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNeedModal(false)}
                  className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createNeedMutation.isPending || updateNeedMutation.isPending}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {createNeedMutation.isPending || updateNeedMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
