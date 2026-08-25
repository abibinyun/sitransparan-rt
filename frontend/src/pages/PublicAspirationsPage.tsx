import React, { useState } from 'react';
import { usePublicAspirations, usePublicCommunityNeeds, useSubmitAspiration } from '../services/aspiration_need';
import { AspirationFormModal } from '../components/AspirationFormModal';
import { CreateAspirationPayload } from '../types/aspiration_need';
import {
  MessageSquareHeart,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Building,
  XCircle
} from 'lucide-react';

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
        return <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-0.5 rounded-lg text-xs font-bold"><Lightbulb className="w-3 h-3 text-blue-500" /> Usulan</span>;
      case 'complaint':
        return <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-100 px-2.5 py-0.5 rounded-lg text-xs font-bold"><AlertTriangle className="w-3 h-3 text-rose-500" /> Keluhan</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-lg text-xs font-bold">{cat}</span>;
    }
  };

  const getAspirationStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-lg text-xs font-bold"><Clock className="w-3 h-3 text-slate-500" /> Terkirim</span>;
      case 'under_review':
        return <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-lg text-xs font-bold"><Clock className="w-3 h-3 text-amber-500" /> Ditinjau Pengurus</span>;
      case 'resolved':
        return <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-lg text-xs font-bold"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Selesai / Ditindaklanjuti</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-lg text-xs font-bold"><XCircle className="w-3 h-3 text-rose-500" /> Ditolak</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-lg text-xs font-bold">{status}</span>;
    }
  };

  return (
    <div className="space-y-10 pb-16">
      {/* Kepala halaman: solid, left-aligned */}
      <section className="bg-slate-900 text-white px-4 sm:px-6 py-10">
        <div className="max-w-6xl mx-auto space-y-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
              Aspirasi &amp; Kebutuhan Lingkungan
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-300 leading-relaxed">
              Sampaikan gagasan, usulan fasilitas, maupun keluhan lingkungan. Semua masukan
              diproses dan statusnya dapat dipantau warga.
            </p>
          </div>
          <button
            onClick={() => setShowFormModal(true)}
            className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm px-5 py-2.5 rounded-lg"
          >
            <PlusCircle className="w-5 h-5" /> Sampaikan Aspirasi
          </button>
        </div>
      </section>

      {/* Main Container */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('aspirations')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 -mb-px ${
              activeTab === 'aspirations'
                ? 'text-emerald-800 border-emerald-700'
                : 'text-slate-500 border-transparent hover:text-slate-800'
            }`}
          >
            <MessageSquareHeart className="w-4 h-4" /> Aspirasi Warga
          </button>
          <button
            onClick={() => setActiveTab('needs')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 -mb-px ${
              activeTab === 'needs'
                ? 'text-emerald-800 border-emerald-700'
                : 'text-slate-500 border-transparent hover:text-slate-800'
            }`}
          >
            <Building className="w-4 h-4" /> Kebutuhan RT
          </button>
        </div>

        {/* Tab 1: Aspirasi Warga */}
        {activeTab === 'aspirations' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Daftar Aspirasi Publik</h2>
                <p className="text-xs text-slate-500 mt-1">Transparansi masukan dan status tindak lanjut pengurus RT</p>
              </div>
            </div>

            {loadingAspirations ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {[1, 2].map((n) => (
                  <div key={n} className="h-44 bg-slate-100 animate-pulse rounded-2xl border border-slate-200" />
                ))}
              </div>
            ) : aspirationsData?.data?.length ? (
              <div className="space-y-4">
                {aspirationsData.data.map((asp) => (
                  <article
                    key={asp.id}
                    className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 space-y-3"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        {getCategoryBadge(asp.category)}
                        {getAspirationStatusBadge(asp.status)}
                      </div>
                      <h3 className="text-base font-bold text-slate-900 leading-snug">{asp.title}</h3>
                      <p className="text-xs sm:text-sm text-slate-600 whitespace-pre-line leading-relaxed">
                        {asp.content}
                      </p>
                    </div>

                    {/* Feedback / Admin Response */}
                    {asp.response && (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3.5 space-y-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 block">
                          Tanggapan Resmi Pengurus
                        </span>
                        <p className="text-xs text-emerald-950 font-medium leading-relaxed">{asp.response}</p>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                      <span>{asp.is_anonymous ? 'Warga (Anonim)' : 'Warga RT'}</span>
                      <span className="tabular-nums">{new Date(asp.created_at).toLocaleDateString('id-ID')}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-3">
                <MessageSquareHeart className="w-10 h-10 text-slate-400 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">Belum Ada Aspirasi Publik</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Jadilah yang pertama menyampaikan ide atau keluhan untuk kebaikan lingkungan bersama.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Kebutuhan Lingkungan */}
        {activeTab === 'needs' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Program Kebutuhan & Fasilitas RT</h2>
                <p className="text-xs text-slate-500 mt-1">Pengadaan inventaris dan perbaikan sarana warga</p>
              </div>
            </div>

            {loadingNeeds ? (
              <div className="h-44 bg-slate-100 animate-pulse rounded-2xl border border-slate-200" />
            ) : needsData?.data?.length ? (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                {needsData.data.map((need) => (
                  <li key={need.id} className="px-5 py-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[10px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-100">
                        {need.status === 'completed' ? 'Selesai Terpenuhi' : 'Program Aktif'}
                      </span>
                      <span className="text-xs font-semibold text-slate-700 tabular-nums">
                        Estimasi Rp {need.estimated_cost?.toLocaleString('id-ID') || '0'}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">{need.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{need.description}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-3">
                <Building className="w-10 h-10 text-slate-400 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">Belum Ada Program Kebutuhan</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Daftar pengadaan inventaris atau fasilitas lingkungan akan ditampilkan secara transparan di sini.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {showFormModal && (
        <AspirationFormModal
          onClose={() => setShowFormModal(false)}
          onSubmit={handleSubmitAspiration}
          isLoading={submitAspirationMutation.isPending}
        />
      )}
    </div>
  );
};
