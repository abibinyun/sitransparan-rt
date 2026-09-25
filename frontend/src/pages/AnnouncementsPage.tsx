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
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/table';
import { Button } from '../components/ui/button';
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
                <Button
                  onClick={handleOpenCreateAnnouncement}
                >
                  + Tambah Pengumuman
                </Button>
              ) : (
                <Button
                  onClick={handleOpenCreateDocument}
                >
                  + Upload Dokumen
                </Button>
              )}
            </div>
          ) : undefined
        }
      />

      {/* Tabs */}
      <div className="border-b border-[#d2d2d7]">
        <nav className="-mb-px flex space-x-6">
          <button
            onClick={() => setActiveTab('announcements')}
            className={`py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'announcements'
                ? 'border-[#0071e3] text-[#0066cc] font-semibold'
                : 'border-transparent text-[#707070] hover:text-[#1d1d1f]'
            }`}
          >
            Pengumuman ({announcementsData?.total || 0})
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'documents'
                ? 'border-[#0071e3] text-[#0066cc] font-semibold'
                : 'border-transparent text-[#707070] hover:text-[#1d1d1f]'
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
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#0066cc] bg-[#f4f8fb] border border-[#d2d2d7] px-2 py-0.5 rounded-full">
                          {item.category === 'kegiatan' ? 'Kegiatan' : item.category === 'santai' ? 'Kabar Santai' : item.category === 'info' ? 'Info' : 'Pengumuman'}
                        </span>
                        {item.target === 'residents_only' ? (
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            Khusus Warga
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            Publik
                          </span>
                        )}
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Judul</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documentsData.data.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-semibold text-[#1d1d1f]">{doc.title}</TableCell>
                    <TableCell className="text-[#707070]">{doc.category}</TableCell>
                    <TableCell className="text-[#707070]">
                      {new Date(doc.created_at).toLocaleDateString('id-ID')}
                    </TableCell>
                    <TableCell className="text-right space-x-3">
                      <a
                        href={getFileUrl(doc.file_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-[#0066cc] hover:underline"
                      >
                        Buka File
                      </a>
                      {!isResident && (
                        <>
                          <button
                            onClick={() => handleOpenEditDocument(doc)}
                            className="font-medium text-[#707070] hover:text-[#1d1d1f]"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="font-medium text-rose-600 hover:underline"
                          >
                            Hapus
                          </button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
