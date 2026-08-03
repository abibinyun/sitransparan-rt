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
  Sparkles,
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
      {/* Hero Header */}
      <section className="bg-gradient-to-b from-indigo-900 via-indigo-900 to-slate-900 text-white pt-12 pb-16 px-4 sm:px-6 lg:px-8 border-b border-indigo-950 relative overflow-hidden">
        <div className="max-w-5xl mx-auto space-y-6 relative z-10 text-center">
          <span className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 px-3 py-1 rounded-full text-xs font-semibold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Suara & Inisiatif Warga RT
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
            Aspirasi & Kebutuhan Lingkungan RT
          </h1>
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-300 font-normal leading-relaxed">
            Sampaikan gagasan, usulan fasilitas, maupun keluhan lingkungan secara terbuka. Semua masukan diproses dan dipantau statusnya secara realtime.
          </p>

          <div className="pt-4 flex justify-center">
            <button
              onClick={() => setShowFormModal(true)}
              className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-sm px-6 py-3 rounded-2xl shadow-xl shadow-indigo-950/50 transition-all hover:-translate-y-0.5"
            >
              <PlusCircle className="w-5 h-5" /> Buat Aspirasi Baru
            </button>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-center">
          <div className="bg-slate-200/70 p-1.5 rounded-2xl flex items-center gap-2 max-w-md w-full border border-slate-300/60 shadow-inner">
            <button
              onClick={() => setActiveTab('aspirations')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'aspirations'
                  ? 'bg-white text-indigo-700 shadow-md border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquareHeart className="w-4 h-4" /> Aspirasi Warga
            </button>
            <button
              onClick={() => setActiveTab('needs')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'needs'
                  ? 'bg-white text-indigo-700 shadow-md border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building className="w-4 h-4" /> Kebutuhan RT
            </button>
          </div>
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
              <div className="grid gap-6 md:grid-cols-2">
                {aspirationsData.data.map((asp) => (
                  <div
                    key={asp.id}
                    className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
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
                      <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3.5 space-y-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 block">
                          Tanggapan Resmi Pengurus RT:
                        </span>
                        <p className="text-xs text-indigo-900 font-medium leading-relaxed">{asp.response}</p>
                      </div>
                    )}

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                      <span>Pengirim: {asp.is_anonymous ? 'Warga (Anonim)' : 'Warga RT 05'}</span>
                      <span>{new Date(asp.created_at).toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>
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
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {needsData.data.map((need) => (
                  <div
                    key={need.id}
                    className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <span className="text-[10px] font-extrabold tracking-wider uppercase px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-100">
                        {need.status === 'completed' ? 'Selesai Terpenuhi' : 'Program Aktif'}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 leading-snug">{need.title}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed">{need.description}</p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex justify-between text-xs font-semibold text-slate-700">
                        <span>Estimasi Anggaran</span>
                        <span className="text-indigo-600 font-bold">
                          Rp {need.estimated_cost?.toLocaleString('id-ID') || '0'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
