import React, { useState } from 'react';
import { usePublicAspirations, usePublicCommunityNeeds, useSubmitAspiration } from '../services/aspiration_need';
import { AspirationFormModal } from '../components/AspirationFormModal';
import { CreateAspirationPayload } from '../types/aspiration_need';

export const PublicAspirationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'aspirations' | 'needs'>('aspirations');
  const [showFormModal, setShowFormModal] = useState(false);

  const { data: aspirationsData, isLoading: loadingAspirations } = usePublicAspirations();
  const { data: needsData, isLoading: loadingNeeds } = usePublicCommunityNeeds();
  const submitAspirationMutation = useSubmitAspiration();

  const handleSubmitAspiration = async (payload: CreateAspirationPayload) => {
    await submitAspirationMutation.mutateAsync(payload);
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
        return <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">Selesai / Ditindaklanjuti</span>;
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
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Aspirasi Warga & Kebutuhan Lingkungan</h1>
            <p className="text-sm text-gray-600">Transparansi usulan warga dan daftar kebutuhan fasilitas lingkungan RT/RW</p>
          </div>
          <button
            onClick={() => setShowFormModal(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 self-start sm:self-auto"
          >
            + Buat Aspirasi / Keluhan
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('aspirations')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'aspirations'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Aspirasi Warga
            </button>
            <button
              onClick={() => setActiveTab('needs')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'needs'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Kebutuhan Lingkungan
            </button>
          </nav>
        </div>

        {/* Tab 1: Aspirations */}
        {activeTab === 'aspirations' && (
          <div>
            {loadingAspirations ? (
              <p className="text-sm text-gray-500">Memuat aspirasi...</p>
            ) : !aspirationsData?.data || aspirationsData.data.length === 0 ? (
              <div className="rounded-lg bg-white p-8 text-center text-gray-500 shadow">
                Belum ada aspirasi warga yang ditampilkan secara publik.
              </div>
            ) : (
              <div className="space-y-4">
                {aspirationsData.data.map((item) => (
                  <div key={item.id} className="rounded-lg bg-white p-5 shadow space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          {getCategoryBadge(item.category)}
                          <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                        </div>
                        <span className="text-xs text-gray-400">
                          {item.is_anonymous ? 'Pengirim: Anonim' : 'Pengirim: Warga'} • {new Date(item.created_at).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                      <div>{getAspirationStatusBadge(item.status)}</div>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{item.content}</p>
                    {item.response && (
                      <div className="rounded bg-blue-50 p-3 text-sm text-blue-900 border border-blue-100">
                        <span className="font-semibold">Tanggapan Pengurus:</span> {item.response}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Community Needs */}
        {activeTab === 'needs' && (
          <div>
            {loadingNeeds ? (
              <p className="text-sm text-gray-500">Memuat kebutuhan lingkungan...</p>
            ) : !needsData?.data || needsData.data.length === 0 ? (
              <div className="rounded-lg bg-white p-8 text-center text-gray-500 shadow">
                Belum ada kebutuhan lingkungan yang tercatat.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {needsData.data.map((need) => (
                  <div key={need.id} className="rounded-lg bg-white p-5 shadow flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{need.title}</h3>
                        {getNeedStatusBadge(need.status)}
                      </div>
                      {need.description && <p className="text-sm text-gray-600 mb-3">{need.description}</p>}
                    </div>

                    <div className="border-t pt-3 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Estimasi Biaya:</span>
                        <span className="font-semibold text-gray-900">
                          Rp {need.estimated_cost.toLocaleString('id-ID')}
                        </span>
                      </div>
                      {need.progress_notes && (
                        <div className="text-xs text-gray-500">
                          <span className="font-medium text-gray-700">Catatan Progres:</span> {need.progress_notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {showFormModal && (
          <AspirationFormModal
            onSubmit={handleSubmitAspiration}
            isLoading={submitAspirationMutation.isPending}
            onClose={() => setShowFormModal(false)}
          />
        )}
      </div>
    </div>
  );
};
