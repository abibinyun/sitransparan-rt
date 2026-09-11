import React, { useState } from 'react';
import {
  useResidents,
  useDeleteResident,
  useDeleteFamilyMember,
  useUpdateResidentStatus,
  usePromoteFamilyMember,
} from '../services/resident';
import { Resident, FamilyMember } from '../types/resident';
import { ResidentModal } from '../components/ResidentModal';
import { ResidentDetailModal } from '../components/ResidentDetailModal';
import { FamilyMemberModal } from '../components/FamilyMemberModal';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { PageHeaderTabs } from '../components/ui/PageHeaderTabs';
import {
  Plus,
  Search,
  UserPlus,
  Trash2,
  Edit3,
  ChevronDown,
  ChevronUp,
  UserCheck,
  ShieldAlert,
  Users,
  QrCode,
  Eye,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export const ResidentsPage: React.FC = () => {
  const { user } = useAuthStore();
  const isResident = String(user?.role || '').toLowerCase() === 'resident';
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const [isResidentModalOpen, setIsResidentModalOpen] = useState(false);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailResident, setDetailResident] = useState<Resident | null>(null);

  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
  const [familyResidentId, setFamilyResidentId] = useState<string | null>(null);
  const [selectedFamilyMember, setSelectedFamilyMember] = useState<FamilyMember | null>(null);

  const [expandedKK, setExpandedKK] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useResidents({
    search: search || undefined,
    page,
    limit,
  });

  const deleteMutation = useDeleteResident();
  const deleteFamilyMutation = useDeleteFamilyMember();
  const updateStatusMutation = useUpdateResidentStatus();
  const promoteMutation = usePromoteFamilyMember();

  const handlePromoteFamilyMember = async (residentId: string, memberId: string, name: string, currentHeadStatus?: string) => {
    const isDeceasedOrMoved = currentHeadStatus === 'deceased' || currentHeadStatus === 'moved';
    const confirmMessage = isDeceasedOrMoved
      ? `Jadikan ${name} sebagai Kepala Keluarga baru menggantikan kepala keluarga yang sudah tidak aktif/meninggal?\nData kepala keluarga sebelumnya akan tetap tercatat dalam arsip keluarga.`
      : `Jadikan ${name} sebagai Kepala Keluarga baru?\nKepala keluarga saat ini akan dialihkan menjadi anggota keluarga.`;

    if (confirm(confirmMessage)) {
      await promoteMutation.mutateAsync({ residentId, memberId });
    }
  };

  const handleUpdateStatus = async (
    id: string,
    name: string,
    status: 'pending' | 'approved' | 'rejected' | 'moved' | 'deceased'
  ) => {
    const labelMap: Record<string, string> = {
      approved: 'Aktif / Disetujui',
      moved: 'Pindah',
      deceased: 'Meninggal Dunia',
      rejected: 'Ditolak',
      pending: 'Menunggu',
    };
    if (confirm(`Ubah status kependudukan ${name} menjadi "${labelMap[status]}"?`)) {
      await updateStatusMutation.mutateAsync({ id, status });
    }
  };

  const residents = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;

  const handleViewDetail = (resident: Resident) => {
    setDetailResident(resident);
    setIsDetailModalOpen(true);
  };

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
    setSelectedFamilyMember(null);
    setIsFamilyModalOpen(true);
  };

  const handleOpenEditFamily = (residentId: string, member: FamilyMember) => {
    setFamilyResidentId(residentId);
    setSelectedFamilyMember(member);
    setIsFamilyModalOpen(true);
  };

  const handleDeleteFamily = async (residentId: string, memberId: string, name: string) => {
    if (confirm(`Hapus anggota keluarga ${name}?`)) {
      await deleteFamilyMutation.mutateAsync({ residentId, memberId });
    }
  };

  const toggleDetailKK = (id: string) => {
    setExpandedKK(expandedKK === id ? null : id);
  };

  const demographyTabs = [
    { to: '/admin/residents', label: 'Data Warga & KK', icon: Users },
    { to: '/admin/houses', label: 'Stiker QR Rumah (1 Rumah 1 Token)', icon: QrCode },
  ];

  return (
    <div className="space-y-6">
      <PageHeaderTabs
        title="Kependudukan & Wilayah"
        description="Kelola data induk kependudukan warga, kartu keluarga, dan penomoran stiker rumah."
        tabs={demographyTabs}
        actions={
          !isResident ? (
            <Button onClick={handleCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Tambah Warga
            </Button>
          ) : undefined
        }
      />

      {/* Search Bar Tunggal Tanpa Dropdown */}
      <Card>
        <CardContent className="p-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Cari kepala keluarga, no KK, NIK, nama anggota keluarga, alamat, no telepon..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
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
                      {r.status === 'moved' ? (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300">
                          Pindah
                        </Badge>
                      ) : r.status === 'deceased' ? (
                        <Badge variant="secondary" className="bg-slate-200 text-slate-700 border-slate-400">
                          Meninggal
                        </Badge>
                      ) : r.status === 'rejected' ? (
                        <Badge variant="destructive">Ditolak</Badge>
                      ) : r.status === 'pending' ? (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                          Menunggu
                        </Badge>
                      ) : (
                        <Badge variant="success">Aktif</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1 whitespace-nowrap">
                      {/* Ganti Status Kependudukan */}
                      <select
                        value={r.status || 'approved'}
                        onChange={(e) =>
                          handleUpdateStatus(
                            r.id,
                            r.full_name,
                            e.target.value as 'pending' | 'approved' | 'rejected' | 'moved' | 'deceased'
                          )
                        }
                        className="text-xs h-8 px-2 py-1 bg-white border border-slate-200 rounded-md text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        title="Ubah Status Kependudukan"
                      >
                        <option value="approved">Aktif</option>
                        <option value="moved">Pindah</option>
                        <option value="deceased">Meninggal</option>
                        <option value="pending">Menunggu</option>
                        <option value="rejected">Ditolak</option>
                      </select>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetail(r)}
                        title="Lihat Detail Lengkap & Dokumen"
                        className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
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
                      {!isResident && (
                        <>
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
                        </>
                      )}
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
                            {!isResident && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenAddFamily(r.id)}
                                className="gap-1 text-xs"
                              >
                                <UserPlus className="h-3.5 w-3.5" /> Tambah Anggota
                              </Button>
                            )}
                          </div>

                          {r.family_members && r.family_members.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Nama</TableHead>
                                  <TableHead>NIK</TableHead>
                                  <TableHead>Hubungan</TableHead>
                                  <TableHead>Jenis Kelamin</TableHead>
                                  {!isResident && <TableHead className="text-right">Aksi</TableHead>}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {r.family_members.map((fm) => (
                                  <TableRow key={fm.id}>
                                    <TableCell className="font-medium">{fm.full_name}</TableCell>
                                    <TableCell className="font-mono text-xs">
                                      {fm.nik ? (
                                        fm.nik
                                      ) : (
                                        <span className="text-[11px] text-slate-400 font-sans italic">Tanpa NIK</span>
                                      )}
                                    </TableCell>
                                    <TableCell><Badge variant="outline">{fm.relation}</Badge></TableCell>
                                    <TableCell>{fm.gender || '-'}</TableCell>
                                    {!isResident && (
                                      <TableCell className="text-right space-x-1">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handlePromoteFamilyMember(r.id, fm.id, fm.full_name, r.status)}
                                          title="Jadikan Kepala Keluarga Baru"
                                          className="h-7 text-xs px-2 text-indigo-700 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-800 gap-1"
                                        >
                                          <UserCheck className="h-3 w-3" /> Jadikan KK
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleOpenEditFamily(r.id, fm)}
                                          title="Edit Anggota Keluarga"
                                        >
                                          <Edit3 className="h-3.5 w-3.5 text-slate-600" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDeleteFamily(r.id, fm.id, fm.full_name)}
                                          title="Hapus Anggota Keluarga"
                                        >
                                          <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                                        </Button>
                                      </TableCell>
                                    )}
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

      {/* Modal Tambah / Edit Warga */}
      <ResidentModal
        isOpen={isResidentModalOpen}
        onClose={() => setIsResidentModalOpen(false)}
        resident={selectedResident}
      />

      {/* Modal Detail Lengkap Warga */}
      <ResidentDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        resident={detailResident}
        onEdit={!isResident ? (res) => {
          setIsDetailModalOpen(false);
          handleEdit(res);
        } : undefined}
        onAddFamily={!isResident ? (resId) => {
          setIsDetailModalOpen(false);
          handleOpenAddFamily(resId);
        } : undefined}
      />

      {/* Modal Tambah / Edit Anggota Keluarga */}
      {familyResidentId && (
        <FamilyMemberModal
          isOpen={isFamilyModalOpen}
          onClose={() => {
            setIsFamilyModalOpen(false);
            setSelectedFamilyMember(null);
          }}
          residentId={familyResidentId}
          member={selectedFamilyMember}
        />
      )}
    </div>
  );
};
