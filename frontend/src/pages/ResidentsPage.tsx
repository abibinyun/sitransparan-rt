import React, { useState } from 'react';
import { useResidents, useDeleteResident } from '../services/resident';
import { Resident } from '../types/resident';
import { ResidentModal } from '../components/ResidentModal';
import { FamilyMemberModal } from '../components/FamilyMemberModal';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { Plus, Search, UserPlus, Trash2, Edit3, ChevronDown, ChevronUp, UserCheck, ShieldAlert } from 'lucide-react';

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
          <h2 className="text-2xl font-bold text-slate-900">Manajemen Warga</h2>
          <p className="text-sm text-slate-500">Kelola data warga dan anggota keluarga RT</p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Tambah Warga
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Cari berdasarkan NAMA atau NIK..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <div className="w-full sm:w-56">
            <Select
              value={headFilter}
              onChange={(e) => {
                setHeadFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">Semua Warga</option>
              <option value="true">Kepala Keluarga Saja</option>
              <option value="false">Anggota Keluarga Saja</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {isLoading ? (
        <Card className="p-8 text-center text-slate-500">Memuat data warga...</Card>
      ) : isError ? (
        <Card className="p-8 text-center text-rose-500 flex items-center justify-center gap-2">
          <ShieldAlert className="h-5 w-5" />
          {(error as any)?.message || 'Gagal memuat data warga'}
        </Card>
      ) : residents.length === 0 ? (
        <Card className="p-8 text-center text-slate-500">Tidak ada data warga ditemukan.</Card>
      ) : (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Lengkap / NIK</TableHead>
                <TableHead>No KK</TableHead>
                <TableHead>Status KK</TableHead>
                <TableHead>No Telepon</TableHead>
                <TableHead>Status Persetujuan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {residents.map((r) => (
                <React.Fragment key={r.id}>
                  <TableRow>
                    <TableCell>
                      <div className="font-semibold text-slate-900">{r.full_name}</div>
                      <div className="text-xs text-slate-400 font-mono">{r.nik}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.kk_number}</TableCell>
                    <TableCell>
                      {r.is_head_of_family ? (
                        <Badge variant="default" className="gap-1">
                          <UserCheck className="h-3 w-3" /> Kepala Keluarga
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Anggota</Badge>
                      )}
                    </TableCell>
                    <TableCell>{r.phone || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="success">Aktif</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {r.is_head_of_family && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleDetailKK(r.id)}
                          title="Lihat/Kelola Anggota Keluarga"
                        >
                          {expandedKK === r.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      )}
                      {r.is_head_of_family && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenAddFamily(r.id)}
                          title="Tambah Anggota Keluarga"
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(r)}
                        title="Edit Warga"
                      >
                        <Edit3 className="h-4 w-4 text-slate-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(r.id, r.full_name)}
                        title="Hapus Warga"
                      >
                        <Trash2 className="h-4 w-4 text-rose-600" />
                      </Button>
                    </TableCell>
                  </TableRow>

                  {/* Expanded Family Details */}
                  {expandedKK === r.id && (
                    <TableRow className="bg-slate-50/70">
                      <TableCell colSpan={6} className="p-4">
                        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-slate-900">
                              Anggota Keluarga (KK: {r.kk_number})
                            </h4>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenAddFamily(r.id)}
                              className="gap-1"
                            >
                              <UserPlus className="h-3.5 w-3.5" /> Tambah Anggota
                            </Button>
                          </div>

                          {r.family_members && r.family_members.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Nama</TableHead>
                                  <TableHead>NIK</TableHead>
                                  <TableHead>Hubungan</TableHead>
                                  <TableHead>Jenis Kelamin</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {r.family_members.map((fm) => (
                                  <TableRow key={fm.id}>
                                    <TableCell className="font-medium">{fm.full_name}</TableCell>
                                    <TableCell className="font-mono text-xs">{fm.nik}</TableCell>
                                    <TableCell><Badge variant="outline">{fm.relation}</Badge></TableCell>
                                    <TableCell>{fm.gender}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <p className="text-xs text-slate-400 italic">Belum ada anggota keluarga terdaftar.</p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex justify-between items-center pt-2">
            <span className="text-xs text-slate-500">
              Menampilkan {residents.length} dari {total} data warga
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Sebelumnya
              </Button>
              <span className="px-3 py-1 text-sm font-semibold text-slate-700">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ResidentModal
        isOpen={isResidentModalOpen}
        onClose={() => setIsResidentModalOpen(false)}
        resident={selectedResident}
      />

      {familyResidentId && (
        <FamilyMemberModal
          isOpen={isFamilyModalOpen}
          onClose={() => {
            setIsFamilyModalOpen(false);
            setFamilyResidentId(null);
          }}
          residentId={familyResidentId}
        />
      )}
    </div>
  );
};
