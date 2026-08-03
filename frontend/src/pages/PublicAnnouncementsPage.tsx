import React from 'react';
import { usePublicAnnouncements, usePublicDocuments } from '../services/announcement_doc';

export const PublicAnnouncementsPage: React.FC = () => {
  const { data: announcementsData, isLoading: loadingAnnouncements } = usePublicAnnouncements();
  const { data: documentsData, isLoading: loadingDocuments } = usePublicDocuments();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Informasi & Dokumen Publik RT</h1>
          <p className="mt-1 text-sm text-gray-600">
            Pengumuman resmi dan arsip dokumen transparan untuk seluruh warga.
          </p>
        </div>

        {/* Section Pengumuman */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-800">Pengumuman Terbaru</h2>
          {loadingAnnouncements ? (
            <p className="text-sm text-gray-500">Memuat pengumuman...</p>
          ) : announcementsData?.data?.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {announcementsData.data.map((item) => (
                <div key={item.id} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      {item.target === 'ALL' ? 'Publik' : 'Warga RT'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(item.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
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
                        className="inline-flex items-center text-xs font-medium text-indigo-600 hover:text-indigo-800 underline"
                      >
                        Lihat Lampiran →
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Belum ada pengumuman publik.</p>
          )}
        </div>

        {/* Section Dokumen */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-800">Dokumen & Arsip Transparansi</h2>
          {loadingDocuments ? (
            <p className="text-sm text-gray-500">Memuat dokumen...</p>
          ) : documentsData?.data?.length ? (
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Judul Dokumen
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
                      <td className="px-6 py-4 text-right text-sm">
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-indigo-600 hover:text-indigo-900 underline"
                        >
                          Unduh / Buka
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Belum ada dokumen publik.</p>
          )}
        </div>
      </div>
    </div>
  );
};
