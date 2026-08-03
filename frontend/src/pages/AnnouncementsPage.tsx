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

export const AnnouncementsPage: React.FC = () => {
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

  const handleSaveDocument = async (payload: CreateDocumentPayload) => {
    if (editingDocument) {
      await updateDocumentMutation.mutateAsync({ id: editingDocument.id, payload });
    } else {
      await createDocumentMutation.mutateAsync(payload);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus dokumen ini?')) {
      await deleteDocumentMutation.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Kelola Pengumuman & Dokumen RT/RW</h2>
          <p className="text-sm text-gray-600">
            Publikasikan pengumuman warga dan upload berkas/notulen resmi.
          </p>
        </div>
        <div>
          {activeTab === 'announcements' ? (
            <button
              onClick={handleOpenCreateAnnouncement}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              + Tambah Pengumuman
            </button>
          ) : (
            <button
              onClick={handleOpenCreateDocument}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              + Upload Dokumen
            </button>
          )}
        </div>
      </div>

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
                          {item.target === 'ALL' ? 'Publik' : 'Khusus Warga'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(item.created_at).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">{item.title}</h3>
                      <p className="text-sm text-gray-700 whitespace-pre-line">{item.content}</p>
                      {item.attachment_url && (
                        <div className="pt-2">
                          <a
                            href={item.attachment_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-indigo-600 underline"
                          >
                            Lampiran File →
                          </a>
                        </div>
                      )}
                    </div>
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
                          href={doc.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-indigo-600 hover:text-indigo-900 underline"
                        >
                          Buka File
                        </a>
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
