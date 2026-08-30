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
  XCircle,
  Search,
  Lock,
  Check
} from 'lucide-react';

export const PublicAspirationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'aspirations' | 'needs'>('aspirations');
  const [showFormModal, setShowFormModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: aspirationsData, isLoading: loadingAspirations } = usePublicAspirations();
  const { data: needsData, isLoading: loadingNeeds } = usePublicCommunityNeeds();
  const submitAspirationMutation = useSubmitAspiration();

  const handleSubmitAspiration = async (payload: CreateAspirationPayload) => {
    await submitAspirationMutation.mutateAsync(payload);
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'suggestion':
        return (
          <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-800 border border-blue-200/80 px-2.5 py-1 rounded-lg text-xs font-bold">
            <Lightbulb className="w-3.5 h-3.5 text-blue-600" /> Usulan / Gagasan
          </span>
        );
      case 'complaint':
        return (
          <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-800 border border-rose-200/80 px-2.5 py-1 rounded-lg text-xs font-bold">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Laporan Keluhan
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-bold">
            {cat}
          </span>
        );
    }
  };

  const getAspirationStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-bold">
            <Clock className="w-3.5 h-3.5 text-slate-500" /> Terkirim
          </span>
        );
      case 'under_review':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-lg text-xs font-bold">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Ditinjau Pengurus
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Selesai / Ditindaklanjuti
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-1 rounded-lg text-xs font-bold">
            <XCircle className="w-3.5 h-3.5 text-rose-600" /> Belum Relevan
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-bold">
            {status}
          </span>
        );
    }
  };

  const aspirations = aspirationsData?.data || [];
  const needs = needsData?.data || [];

  const filteredAspirations = aspirations.filter(
    (a) =>
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.content || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="pb-16 space-y-8">
      {/* Hero Section */}
      <section className="bg-slate-900 text-white px-4 sm:px-6 py-10 sm:py-14 border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold px-3 py-1 rounded-full">
              <MessageSquareHeart className="w-3.5 h-3.5" /> Ruang Dengar Warga
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              Aspirasi &amp; Kebutuhan Lingkungan RT
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
              Suarakan gagasan perbaikan lingkungan, usulan fasilitas bersama, atau aduan masalah warga. Setiap suara dipantau langsung oleh pengurus.
            </p>
          </div>

          <button
            onClick={() => setShowFormModal(true)}
            className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm px-6 py-3.5 rounded-xl transition-all shadow-md shadow-emerald-500/20 active:scale-95 shrink-0"
          >
            <PlusCircle className="w-5 h-5" /> Sampaikan Aspirasi Baru
          </button>
        </div>
      </section>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Tab & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('aspirations')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all ${
                activeTab === 'aspirations'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <MessageSquareHeart className="w-4 h-4 text-emerald-400" /> Aspirasi Warga ({aspirations.length})
            </button>
            <button
              onClick={() => setActiveTab('needs')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all ${
                activeTab === 'needs'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Building className="w-4 h-4 text-amber-400" /> Kebutuhan Lingkungan ({needs.length})
            </button>
          </div>

          {activeTab === 'aspirations' && (
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Cari aspirasi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white text-xs sm:text-sm pl-9 pr-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
          )}
        </div>

        {/* Tab Content: Aspirasi */}
        {activeTab === 'aspirations' && (
          <div className="space-y-4" aria-label="Daftar Aspirasi Publik">
            <h2 className="sr-only">Daftar Aspirasi Publik</h2>
            {loadingAspirations ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 rounded-2xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : filteredAspirations.length === 0 ? (
              <div className="civic-card p-10 text-center space-y-2">
                <MessageSquareHeart className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="font-bold text-sm text-slate-700">Belum Ada Aspirasi</p>
                <p className="text-xs text-slate-500">Jadilah warga pertama yang menyampaikan usulan konstruktif.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAspirations.map((item) => (
                  <article key={item.id} className="civic-card p-5 sm:p-6 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {getCategoryBadge(item.category)}
                        {item.is_anonymous && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            <Lock className="w-3 h-3" /> Anonim
                          </span>
                        )}
                      </div>
                      {getAspirationStatusBadge(item.status)}
                    </div>

                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                        {item.content}
                      </p>
                    </div>

                    {/* Respon Pengurus RT jika ada */}
                    {item.response && (
                      <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-4 space-y-1">
                        <p className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                          <Check className="w-4 h-4 text-emerald-600" /> Tindak Lanjut Pengurus RT
                        </p>
                        <p className="text-xs text-emerald-900 leading-relaxed">
                          {item.response}
                        </p>
                      </div>
                    )}

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                      <span>{item.is_anonymous ? 'Warga Lingkungan (Anonim)' : 'Warga RT'}</span>
                      <span>{new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Kebutuhan RT */}
        {activeTab === 'needs' && (
          <div className="space-y-4">
            {loadingNeeds ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-32 rounded-2xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : needs.length === 0 ? (
              <div className="civic-card p-10 text-center space-y-2">
                <Building className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="font-bold text-sm text-slate-700">Belum Ada Daftar Kebutuhan Sarpras</p>
                <p className="text-xs text-slate-500">Kebutuhan infrastruktur lingkungan yang direncanakan akan muncul di sini.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {needs.map((item) => (
                  <div key={item.id} className="civic-card p-5 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Sarana &amp; Prasarana
                        </span>
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          {item.status}
                        </span>
                      </div>
                      <h4 className="font-bold text-base text-slate-900 leading-snug">{item.title}</h4>
                      {item.description && (
                        <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Estimasi Biaya:</span>
                      <span className="font-extrabold text-slate-900">
                        {item.estimated_cost ? `Rp ${item.estimated_cost.toLocaleString('id-ID')}` : 'Dihitung dalam RAB'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Form Aspirasi */}
      {showFormModal && (
        <AspirationFormModal
          isOpen={showFormModal}
          onClose={() => setShowFormModal(false)}
          onSubmit={handleSubmitAspiration}
        />
      )}
    </div>
  );
};
