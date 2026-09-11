import React, { useState } from 'react';
import {
  useAnnouncements,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
  useDocuments,
  useCreateDocument,
  useUpdateDocument,
  useDeleteDocument,
} from '../services/announcement_doc';
import { AnnouncementModal } from '../components/AnnouncementModal';
import { DocumentUploadModal } from '../components/DocumentUploadModal';
import { Announcement, CreateAnnouncementPayload, Document, CreateDocumentPayload } from '../types/announcement_doc';
import { PageHeaderTabs } from '../components/ui/PageHeaderTabs';
import { FileText, MessageSquareHeart, Vote } from 'lucide-react';
import { getFileUrl } from '../utils/file';
import { useAuthStore } from '../store/useAuthStore';

export const AnnouncementsPage: React.FC = () => {
  const { user } = useAuthStore();
  const isResident = String(user?.role || '').toLowerCase() === 'resident';
  const [activeTab, setActiveTab] = useState<'announcements' | 'documents'>('announcements');

  // Announcement state & hooks
  const { data: announcementsData, isLoading: loadingAnnouncements } = useAnnouncements();
  const createAnnouncementMutation = useCreateAnnouncement();
  const updateAnnouncementMutation = useUpdateAnnouncement();
  const deleteAnnouncementMutation = useDeleteAnnouncement();

  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

  // Document state & hooks
  const { data: documentsData, isLoading: loadingDocuments } = useDocuments();
  const createDocumentMutation = useCreateDocument();
  const updateDocumentMutation = useUpdateDocument();
  const deleteDocumentMutation = useDeleteDocument();

  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);

  // Handlers for Announcement
  const handleOpenCreateAnnouncement = () => {
    setEditingAnnouncement(null);
    setIsAnnouncementModalOpen(true);
  };

  const handleOpenEditAnnouncement = (item: Announcement) => {
    setEditingAnnouncement(item);
    setIsAnnouncementModalOpen(true);
  };

  const handleSaveAnnouncement = async (payload: CreateAnnouncementPayload) => {
    if (editingAnnouncement) {
      await updateAnnouncementMutation.mutateAsync({ id: editingAnnouncement.id, payload });
    } else {
      await createAnnouncementMutation.mutateAsync(payload);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus pengumuman ini?')) {
      await deleteAnnouncementMutation.mutateAsync(id);
    }
  };

  // Handlers for Document
  const handleOpenCreateDocument = () => {
    setEditingDocument(null);
    setIsDocumentModalOpen(true);
  };

  const handleOpenEditDocument = (item: Document) => {
    setEditingDocument(item);
    setIsDocumentModalOpen(true);
  };

  const handleSaveDocument = async (payload: CreateDocumentPayload | FormData) => {
    if (editingDocument) {
      if (payload instanceof FormData) {
        // If editing with a new file, update title/category
        const title = payload.get('title') as string;
        const category = payload.get('category') as string;
        await updateDocumentMutation.mutateAsync({ id: editingDocument.id, payload: { title, category } });
      } else {
        await updateDocumentMutation.mutateAsync({ id: editingDocument.id, payload });
      }
    } else {
      await createDocumentMutation.mutateAsync(payload);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus dokumen ini?')) {
      await deleteDocumentMutation.mutateAsync(id);
    }
  };

  const commTabs = [
    { to: '/admin/announcements', label: 'Pengumuman & Dokumen', icon: FileText },
    { to: '/admin/aspirations', label: 'Aspirasi & Kebutuhan', icon: MessageSquareHeart },
    { to: '/admin/polls', label: 'Polling Warga', icon: Vote },
  ];

  return (
    <div className="space-y-6">
      <PageHeaderTabs
        title="Kelola Pengumuman & Dokumen RT/RW"
        description="Pusat informasi resmi RT, publikasi berkas, penampungan usulan, dan polling suara warga."
        tabs={commTabs}
        actions={
          !isResident ? (
            <div>
              {activeTab === 'announcements' ? (
                <button
                  onClick={handleOpenCreateAnnouncement}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm"
                >
                  + Tambah Pengumuman
                </button>
              ) : (
                <button
                  onClick={handleOpenCreateDocument}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm"
                >
                  + Upload Dokumen
                </button>
              )}
            </div>
          ) : undefined
        }
      />

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('announcements')}
            className={`py-3 text-sm font-medium border-b-2 ${
              activeTab === 'announcements'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Pengumuman ({announcementsData?.total || 0})
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`py-3 text-sm font-medium border-b-2 ${
              activeTab === 'documents'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Dokumen & Berkas ({documentsData?.total || 0})
          </button>
        </nav>
      </div>

      {/* Tab Content: Announcements */}
      {activeTab === 'announcements' && (
        <div>
          {loadingAnnouncements ? (
            <p className="text-sm text-gray-500">Memuat pengumuman...</p>
          ) : announcementsData?.data?.length ? (
            <div className="space-y-4">
              {announcementsData.data.map((item) => (
                <div key={item.id} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          {item.target === 'residents_only' ? 'Khusus Warga' : 'Publik'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(item.created_at).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">{item.title}</h3>
                      <p className="text-sm text-gray-700 whitespace-pre-line">{item.content}</p>
                      {/* Foto & Lampiran Preview Bar */}
                      {(() => {
                        const photos = [
                          ...(item.attachment_url ? [item.attachment_url] : []),
                          ...(item.media_urls || []),
                        ];
                        const files = item.file_urls || [];
                        return (
                          <div className="pt-2 space-y-2">
                            {photos.length > 0 && (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[11px] font-semibold text-slate-500">
                                  Foto ({photos.length}):
                                </span>
                                {photos.slice(0, 4).map((p, idx) => (
                                  <a
                                    key={idx}
                                    href={getFileUrl(p)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block border border-slate-200 rounded overflow-hidden hover:opacity-80 transition-opacity"
                                  >
                                    <img
                                      src={getFileUrl(p)}
                                      alt={`Foto ${idx + 1}`}
                                      className="w-10 h-10 object-cover"
                                    />
                                  </a>
                                ))}
                                {photos.length > 4 && (
                                  <span className="text-[11px] text-slate-400 font-medium">
                                    +{photos.length - 4} foto lainnya
                                  </span>
                                )}
                              </div>
                            )}

                            {files.length > 0 && (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[11px] font-semibold text-slate-500">
                                  Berkas Lampiran ({files.length}):
                                </span>
                                {files.map((f, idx) => (
                                  <a
                                    key={idx}
                                    href={getFileUrl(f)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded font-medium truncate max-w-[200px]"
                                  >
                                    <FileText className="w-3 h-3 text-indigo-600 shrink-0" />
                                    <span className="truncate">{f.split('/').pop() || f}</span>
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    {!isResident && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleOpenEditAnnouncement(item)}
                          className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteAnnouncement(item.id)}
                          className="rounded bg-red-50 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                        >
                          Hapus
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Belum ada pengumuman.</p>
          )}
        </div>
      )}

      {/* Tab Content: Documents */}
      {activeTab === 'documents' && (
        <div>
          {loadingDocuments ? (
            <p className="text-sm text-gray-500">Memuat dokumen...</p>
          ) : documentsData?.data?.length ? (
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Judul
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Kategori
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Tanggal
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {documentsData.data.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{doc.title}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{doc.category}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(doc.created_at).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-6 py-4 text-right text-sm space-x-3">
                        <a
                          href={getFileUrl(doc.file_url)}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-indigo-600 hover:text-indigo-900 underline"
                        >
                          Buka File
                        </a>
                        {!isResident && (
                          <>
                            <button
                              onClick={() => handleOpenEditDocument(doc)}
                              className="font-medium text-gray-600 hover:text-gray-900"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="font-medium text-red-600 hover:text-red-900"
                            >
                              Hapus
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Belum ada dokumen.</p>
          )}
        </div>
      )}

      {/* Modals */}
      <AnnouncementModal
        isOpen={isAnnouncementModalOpen}
        onClose={() => setIsAnnouncementModalOpen(false)}
        onSubmit={handleSaveAnnouncement}
        initialData={editingAnnouncement}
        isLoading={createAnnouncementMutation.isPending || updateAnnouncementMutation.isPending}
      />

      <DocumentUploadModal
        isOpen={isDocumentModalOpen}
        onClose={() => setIsDocumentModalOpen(false)}
        onSubmit={handleSaveDocument}
        initialData={editingDocument}
        isLoading={createDocumentMutation.isPending || updateDocumentMutation.isPending}
      />
    </div>
  );
};
