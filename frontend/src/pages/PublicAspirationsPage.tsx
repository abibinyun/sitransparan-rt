import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePublicAspirations, usePublicCommunityNeeds, useSubmitAspiration } from '../services/aspiration_need';
import { AspirationFormModal } from '../components/AspirationFormModal';
import { CreateAspirationPayload } from '../types/aspiration_need';
import { useAuthStore } from '../store/useAuthStore';
import {
  MessageSquareHeart,
  PlusCircle,
  Building,
  Search,
  Check,
  Lightbulb,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react';

export const PublicAspirationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'aspirations' | 'needs'>('aspirations');
  const [showFormModal, setShowFormModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: aspirationsData, isLoading: loadingAspirations } = usePublicAspirations();
  const { data: needsData, isLoading: loadingNeeds } = usePublicCommunityNeeds();
  const submitAspirationMutation = useSubmitAspiration();

  const handleOpenSubmitModal = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setShowFormModal(true);
  };

  const handleSubmitAspiration = async (payload: CreateAspirationPayload) => {
    await submitAspirationMutation.mutateAsync(payload);
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'suggestion':
        return (
          <span className="inline-flex items-center gap-1.5 bg-[#f4f8fb] text-[#0066cc] border border-[#d2d2d7] px-2.5 py-1 rounded-full text-xs font-semibold">
            <Lightbulb className="w-3.5 h-3.5 text-[#0071e3]" /> Usulan / Gagasan
          </span>
        );
      case 'complaint':
        return (
          <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-1 rounded-full text-xs font-semibold">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Laporan Keluhan
          </span>
        );
      default:
        return (
          <span className="bg-[#f5f5f7] text-[#707070] border border-[#d2d2d7] px-2.5 py-1 rounded-full text-xs font-semibold">
            {cat}
          </span>
        );
    }
  };

  const getAspirationStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1 bg-[#f5f5f7] text-[#707070] border border-[#d2d2d7] px-2.5 py-1 rounded-full text-xs font-semibold">
            <Clock className="w-3.5 h-3.5 text-[#707070]" /> Terkirim
          </span>
        );
      case 'under_review':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full text-xs font-semibold">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Ditinjau Pengurus
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Selesai / Ditindaklanjuti
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-1 rounded-full text-xs font-semibold">
            <XCircle className="w-3.5 h-3.5 text-rose-600" /> Belum Relevan
          </span>
        );
      default:
        return (
          <span className="bg-[#f5f5f7] text-[#707070] border border-[#d2d2d7] px-2.5 py-1 rounded-full text-xs font-semibold">
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
    <div className="pb-16 space-y-8 bg-[#f5f5f7] text-[#1d1d1f] min-h-screen">
      {/* Hero Section Apple */}
      <section className="bg-white text-[#1d1d1f] px-4 sm:px-6 py-12 sm:py-16 border-b border-[#d2d2d7]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight leading-tight text-[#1d1d1f]">
              Aspirasi &amp; Kebutuhan Lingkungan RT
            </h1>
            <p className="text-xs sm:text-sm text-[#707070] leading-relaxed font-normal">
              Suarakan gagasan perbaikan lingkungan, usulan fasilitas bersama, atau aduan masalah warga. Setiap suara dipantau langsung oleh pengurus.
            </p>
          </div>

          <button
            onClick={handleOpenSubmitModal}
            className="inline-flex items-center justify-center gap-2 apple-btn-primary text-xs sm:text-sm px-6 py-3 shrink-0"
          >
            <PlusCircle className="w-4 h-4 text-white" /> Sampaikan Aspirasi Baru
          </button>
        </div>
      </section>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Tab & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#d2d2d7] pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('aspirations')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm transition-all ${
                activeTab === 'aspirations'
                  ? 'bg-[#1d1d1f] text-white font-medium shadow-xs'
                  : 'bg-white text-[#707070] border border-[#d2d2d7] hover:text-[#1d1d1f] hover:bg-[#f5f5f7]'
              }`}
            >
              <MessageSquareHeart className="w-4 h-4 text-[#0071e3]" /> Aspirasi Warga ({aspirations.length})
            </button>
            <button
              onClick={() => setActiveTab('needs')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm transition-all ${
                activeTab === 'needs'
                  ? 'bg-[#1d1d1f] text-white font-medium shadow-xs'
                  : 'bg-white text-[#707070] border border-[#d2d2d7] hover:text-[#1d1d1f] hover:bg-[#f5f5f7]'
              }`}
            >
              <Building className="w-4 h-4 text-amber-600" /> Kebutuhan Lingkungan ({needs.length})
            </button>
          </div>

          {activeTab === 'aspirations' && (
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-[#858585] absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Cari aspirasi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white text-[#1d1d1f] placeholder-[#858585] text-xs sm:text-sm pl-9 pr-3 py-2 border border-[#d2d2d7] rounded-full focus:outline-none focus:border-[#0071e3]"
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
                  <div key={i} className="h-32 rounded-lg bg-[#e2e2e5] animate-pulse" />
                ))}
              </div>
            ) : filteredAspirations.length === 0 ? (
              <div className="apple-card p-10 text-center space-y-2">
                <MessageSquareHeart className="w-8 h-8 text-[#858585] mx-auto" />
                <p className="font-semibold text-sm text-[#1d1d1f]">Belum Ada Aspirasi</p>
                <p className="text-xs text-[#707070]">Jadilah warga pertama yang menyampaikan usulan konstruktif.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAspirations.map((item) => (
                  <article key={item.id} className="apple-card p-5 sm:p-6 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {getCategoryBadge(item.category)}
                      </div>
                      {getAspirationStatusBadge(item.status)}
                    </div>

                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-[#1d1d1f] leading-snug">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-xs sm:text-sm text-[#333333] leading-relaxed whitespace-pre-line">
                        {item.content}
                      </p>
                    </div>

                    {/* Respon Pengurus RT jika ada */}
                    {item.response && (
                      <div className="bg-[#f4f8fb] border border-[#d2d2d7] rounded-lg p-4 space-y-1">
                        <p className="text-xs font-semibold text-[#0066cc] flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Check className="w-4 h-4 text-[#0066cc]" /> Tindak Lanjut Pengurus RT
                          </span>
                          {item.responder_name && (
                            <span className="text-[11px] font-medium text-[#707070] bg-white px-2.5 py-0.5 rounded-full border border-[#d2d2d7]">
                              Dijawab oleh: {item.responder_name}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-[#1d1d1f] leading-relaxed">
                          {item.response}
                        </p>
                      </div>
                    )}

                    <div className="pt-3 border-t border-[#d2d2d7] flex items-center justify-between text-xs text-[#707070]">
                      <span className="font-medium text-[#1d1d1f]">Oleh: {item.author_name || 'Warga RT'}</span>
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
                  <div key={i} className="h-32 rounded-lg bg-[#e2e2e5] animate-pulse" />
                ))}
              </div>
            ) : needs.length === 0 ? (
              <div className="apple-card p-10 text-center space-y-2">
                <Building className="w-8 h-8 text-[#858585] mx-auto" />
                <p className="font-semibold text-sm text-[#1d1d1f]">Belum Ada Daftar Kebutuhan Sarpras</p>
                <p className="text-xs text-[#707070]">Kebutuhan infrastruktur lingkungan yang direncanakan akan muncul di sini.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {needs.map((item) => (
                  <div key={item.id} className="apple-card p-5 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#707070]">
                          Sarana &amp; Prasarana
                        </span>
                        <span className="text-[11px] font-semibold text-[#0066cc] bg-[#f4f8fb] px-2 py-0.5 rounded-full border border-[#d2d2d7]">
                          {item.status}
                        </span>
                      </div>
                      <h4 className="font-semibold text-base text-[#1d1d1f] leading-snug">{item.title}</h4>
                      {item.description && (
                        <p className="text-xs text-[#474747] leading-relaxed">{item.description}</p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#d2d2d7] flex items-center justify-between text-xs">
                      <span className="text-[#707070] font-normal">Estimasi Biaya:</span>
                      <span className="font-semibold font-mono text-[#1d1d1f]">
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
