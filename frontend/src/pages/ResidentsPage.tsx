import React, { useState } from 'react';
import { useResidents, useDeleteResident } from '../services/resident';
import { Resident } from '../types/resident';
import { ResidentModal } from '../components/ResidentModal';
import { FamilyMemberModal } from '../components/FamilyMemberModal';

export const ResidentsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [headFilter, setHeadFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const limit = 10;

  const [isResidentModalOpen, setIsResidentModalOpen] = useState(false);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);

  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
  const [familyResidentId, setFamilyResidentId] = useState<string | null>(null);

  const [expandedKK, setExpandedKK] = useState<string | null>(null);

  const isHeadOfFamilyParam =
    headFilter === 'true' ? true : headFilter === 'false' ? false : undefined;

  const { data, isLoading, isError, error } = useResidents({
    search: search || undefined,
    is_head_of_family: isHeadOfFamilyParam,
    page,
    limit,
  });

  const deleteMutation = useDeleteResident();

  const residents = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;

  const handleEdit = (resident: Resident) => {
    setSelectedResident(resident);
    setIsResidentModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedResident(null);
    setIsResidentModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus data warga ${name}?`)) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleOpenAddFamily = (residentId: string) => {
    setFamilyResidentId(residentId);
    setIsFamilyModalOpen(true);
  };

  const toggleDetailKK = (id: string) => {
    setExpandedKK(expandedKK === id ? null : id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manajemen Warga</h2>
          <p className="text-sm text-gray-600">Kelola data warga dan anggota keluarga RT</p>
        </div>
        <button
          onClick={handleCreate}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 shadow-sm"
        >
          + Tambah Warga
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex-1 w-full">
          <input
            type="text"
            placeholder="Cari berdasarkan NAMA atau NIK..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            value={headFilter}
            onChange={(e) => {
              setHeadFilter(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">Semua Warga</option>
            <option value="true">Kepala Keluarga</option>
            <option value="false">Bukan Kepala Keluarga</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Memuat data warga...</div>
        ) : isError ? (
          <div className="p-8 text-center text-red-500">
            Gagal memuat data: {(error as Error)?.message || 'Terjadi kesalahan'}
          </div>
        ) : residents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Tidak ada data warga ditemukan.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">NIK / No KK</th>
                  <th className="px-6 py-3">Nama Lengkap</th>
                  <th className="px-6 py-3">L/P</th>
                  <th className="px-6 py-3">Status KK</th>
                  <th className="px-6 py-3">No HP / RT RW</th>
                  <th className="px-6 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {residents.map((res) => (
                  <React.Fragment key={res.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-900">{res.nik}</div>
                        <div className="text-xs text-gray-500">KK: {res.kk_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                        {res.full_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{res.gender}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {res.is_head_of_family ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Kepala Keluarga
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Anggota
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        <div>{res.phone || '-'}</div>
                        <div className="text-xs text-gray-500">{res.rt_rw || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => toggleDetailKK(res.id)}
                          className="text-indigo-600 hover:text-indigo-900 mr-2"
                        >
                          {expandedKK === res.id ? 'Tutup Detail' : 'Detail KK'}
                        </button>
                        <button
                          onClick={() => handleEdit(res)}
                          className="text-amber-600 hover:text-amber-900 mr-2"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(res.id, res.full_name)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                    {expandedKK === res.id && (
                      <tr className="bg-indigo-50/40">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <h4 className="text-sm font-semibold text-gray-800">
                                Anggota Keluarga (KK: {res.kk_number})
                              </h4>
                              <button
                                onClick={() => handleOpenAddFamily(res.id)}
                                className="rounded bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700"
                              >
                                + Anggota Keluarga
                              </button>
                            </div>
                            {res.family_members && res.family_members.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {res.family_members.map((fam) => (
                                  <div
                                    key={fam.id}
                                    className="p-3 bg-white rounded border border-gray-200 text-xs space-y-1 shadow-sm"
                                  >
                                    <div className="font-semibold text-gray-900">{fam.full_name}</div>
                                    <div className="text-gray-600">NIK: {fam.nik}</div>
                                    <div className="text-gray-600">
                                      Hubungan: <span className="font-medium">{fam.relation}</span>
                                    </div>
                                    <div className="text-gray-500">Gender: {fam.gender}</div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-xs text-gray-500 italic">
                                Belum ada anggota keluarga terdaftar.
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-t border-gray-200">
            <div className="text-xs text-gray-600">
              Halaman {page} dari {totalPages} (Total {total} warga)
            </div>
            <div className="flex space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded border border-gray-300 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Sebelumnya
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 rounded border border-gray-300 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      <ResidentModal
        isOpen={isResidentModalOpen}
        onClose={() => setIsResidentModalOpen(false)}
        resident={selectedResident}
      />

      {familyResidentId && (
        <FamilyMemberModal
          isOpen={isFamilyModalOpen}
          onClose={() => setIsFamilyModalOpen(false)}
          residentId={familyResidentId}
        />
      )}
    </div>
  );
};
