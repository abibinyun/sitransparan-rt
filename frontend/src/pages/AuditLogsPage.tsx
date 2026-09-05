import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { SimpleDialog } from '../components/ui/dialog';
import { ShieldCheck, Search, RefreshCw, AlertCircle, ArrowLeft, ArrowRight, Users, Eye, CheckCircle2, XCircle } from 'lucide-react';
import { PageHeaderTabs } from '../components/ui/PageHeaderTabs';

interface AuditLog {
  id: string;
  tenant_id?: string;
  user_id?: string;
  house_id?: string;
  action: string;
  resource: string;
  payload?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  status: string;
  error_message?: string;
  created_at: string;
}

function getHumanAction(action: string, resource: string): { title: string; desc: string; category: string } {
  const parts = action.split(' ');
  const method = parts[0]?.toUpperCase() || '';
  const path = parts[1] || action;

  // Specific path matches
  if (path.includes('/auth/login')) return { title: 'Masuk Akun (Login)', desc: 'Pengguna melakukan autentikasi ke sistem', category: 'Keamanan' };
  if (path.includes('/auth/register')) return { title: 'Pendaftaran Akun Baru', desc: 'Pendaftaran akun warga/pengurus baru', category: 'Keamanan' };
  if (path.includes('/auth/switch-tenant')) return { title: 'Ganti Lingkungan RT', desc: 'Beralih konteks kerja rukun tetangga', category: 'Keamanan' };
  if (path.includes('/push/subscribe')) return { title: 'Aktivasi Notifikasi', desc: 'Mendaftarkan perangkat untuk push notification', category: 'Sistem' };

  // Dues / Financial
  if (path.includes('/financial/dues') && path.includes('/verify')) return { title: 'Verifikasi Iuran Warga', desc: 'Mengonfirmasi pembayaran iuran kas RT', category: 'Keuangan' };
  if (path.includes('/financial/dues') && method === 'POST') return { title: 'Pencatatan Iuran', desc: 'Menambahkan tagihan atau iuran baru', category: 'Keuangan' };
  if (path.includes('/financial/transactions') && method === 'POST') return { title: 'Catat Arus Kas RT', desc: 'Menambah transaksi pemasukan/pengeluaran buku kas', category: 'Keuangan' };
  if (path.includes('/financial/upload')) return { title: 'Unggah Bukti Bayar', desc: 'Mengunggah struk/bukti transfer iuran', category: 'Keuangan' };

  // Residents & Houses
  if (path.includes('/residents') && path.includes('/approve')) return { title: 'Persetujuan Data Warga', desc: 'Menyetujui pendaftaran identitas warga ke buku induk RT', category: 'Kependudukan' };
  if (path.includes('/residents') && path.includes('/reject')) return { title: 'Penolakan Data Warga', desc: 'Menolak permohonan data kependudukan', category: 'Kependudukan' };
  if (path.includes('/residents') && method === 'POST') return { title: 'Tambah Data Warga', desc: 'Mendaftarkan warga baru ke sistem', category: 'Kependudukan' };
  if (path.includes('/residents') && method === 'PUT') return { title: 'Perbarui Data Warga', desc: 'Memperbarui rincian identitas warga', category: 'Kependudukan' };
  if (path.includes('/residents') && method === 'DELETE') return { title: 'Hapus Data Warga', desc: 'Menghapus data kependudukan warga', category: 'Kependudukan' };
  if (path.includes('/houses') && method === 'POST') return { title: 'Tambah Data Rumah', desc: 'Mendaftarkan nomor kavling atau rumah baru', category: 'Kependudukan' };

  // Aspirations & Community Needs
  if (path.includes('/aspirations') && method === 'POST') return { title: 'Kirim Aspirasi Warga', desc: 'Menyampaikan saran atau keluhan warga', category: 'Aspirasi' };
  if (path.includes('/aspirations') && method === 'PUT') return { title: 'Tanggapi Aspirasi', desc: 'Pengurus memberikan respon dan status aspirasi', category: 'Aspirasi' };
  if (path.includes('/needs') && method === 'POST') return { title: 'Usulan Kebutuhan Sarpras', desc: 'Mengajukan rencana sarana atau perbaikan lingkungan', category: 'Sarpras' };
  if (path.includes('/needs') && method === 'PUT') return { title: 'Update Progres Kebutuhan', desc: 'Memperbarui status pengerjaan sarpras lingkungan', category: 'Sarpras' };

  // Events & Meetings
  if (path.includes('/events') && method === 'POST') return { title: 'Buat Agenda Kegiatan RT', desc: 'Menambahkan jadwal agenda atau kerja bakti', category: 'Kegiatan' };
  if (path.includes('/meetings') && method === 'POST') return { title: 'Buat Notula Musyawarah', desc: 'Mencatat jadwal musyawarah atau rapat pengurus', category: 'Musyawarah' };

  // Announcements & Documents
  if (path.includes('/announcements') && method === 'POST') return { title: 'Terbitkan Pengumuman', desc: 'Menyiarkan warta penting untuk warga', category: 'Informasi' };
  if (path.includes('/documents') && method === 'POST') return { title: 'Unggah Arsip RT', desc: 'Menyimpan dokumen resmi atau surat edaran', category: 'Informasi' };

  // Users & Access
  if (path.includes('/users') && method === 'POST') return { title: 'Tambah Pengurus / Pengguna', desc: 'Membuat akun akses baru di RT', category: 'Akses' };
  if (path.includes('/users') && method === 'PUT') return { title: 'Perbarui Akses Pengguna', desc: 'Mengubah peran atau status akun', category: 'Akses' };

  // Waste Bank & Programs
  if (path.includes('/waste-bank') && method === 'POST') return { title: 'Transaksi Bank Sampah', desc: 'Mencatat setoran atau kategori sampah', category: 'Pemberdayaan' };

  // Generic fallback based on method
  let methodAction = 'Aktivitas pada';
  if (method === 'POST') methodAction = 'Menambahkan data';
  else if (method === 'PUT' || method === 'PATCH') methodAction = 'Memperbarui data';
  else if (method === 'DELETE') methodAction = 'Menghapus data';

  return {
    title: `${methodAction} ${resource || 'sistem'}`,
    desc: `${method} ${path}`,
    category: resource ? resource.toUpperCase() : 'UMUM',
  };
}

export function AuditLogsPage() {
  const [searchAction, setSearchAction] = useState('');
  const [selectedResource] = useState('');
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const limit = 20;

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['audit-logs', page, searchAction, selectedResource],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: ((page - 1) * limit).toString(),
      });
      if (searchAction) params.append('action', searchAction);
      if (selectedResource) params.append('resource', selectedResource);

      const res = await api.get<{ data: AuditLog[]; total: number }>(`/admin/audit-logs?${params.toString()}`);
      return res.data;
    },
  });

  const totalPages = Math.ceil((data?.total || 0) / limit);

  const settingsTabs = [
    { to: '/admin/users', label: 'Manajemen Pengguna & Akses', icon: Users },
    { to: '/admin/audit-logs', label: 'Audit Trail & Rekam Jejak', icon: ShieldCheck },
  ];

  return (
    <div className="space-y-6">
      <PageHeaderTabs
        title="Pengaturan Akun & Keamanan"
        description="Kelola hak akses pengurus RT, penetapan peran warga, serta rekam jejak aktivitas audit."
        tabs={settingsTabs}
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Segarkan
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari aksi (login, iuran, warga, hapus)..."
                value={searchAction}
                onChange={(e) => {
                  setSearchAction(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Total <b>{data?.total || 0}</b> aktivitas terekam
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Memuat catatan audit log...</div>
          ) : isError ? (
            <div className="py-12 text-center text-destructive text-sm flex items-center justify-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Gagal memuat catatan audit log. Pastikan Anda memiliki hak akses Admin.
            </div>
          ) : !data?.data || data.data.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Belum ada aktivitas terekam.</div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[170px]">Waktu Kejadian</TableHead>
                    <TableHead>Aktivitas & Keterangan</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Alamat IP</TableHead>
                    <TableHead className="text-right w-[100px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((log: AuditLog) => {
                    const human = getHumanAction(log.action, log.resource);
                    const isSuccess = log.status === 'SUCCESS';

                    return (
                      <TableRow key={log.id} className="hover:bg-slate-50/50">
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-xs sm:text-sm text-slate-900">{human.title}</div>
                          <div className="text-[11px] text-muted-foreground font-mono truncate max-w-sm" title={log.action}>
                            {log.action}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[11px] font-medium bg-slate-50">
                            {human.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              isSuccess ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {isSuccess ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {isSuccess ? 'Berhasil' : 'Gagal'}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {log.ip_address || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs flex items-center gap-1 ml-auto"
                            onClick={() => setSelectedLog(log)}
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>Detail</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t text-xs text-muted-foreground">
              <div>
                Halaman {page} dari {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" /> Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Berikutnya <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedLog && (
        <SimpleDialog
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title="Rincian Rekam Jejak (Audit Log)"
          description={`ID: ${selectedLog.id}`}
        >
          <div className="space-y-4 text-xs sm:text-sm">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-500 block text-xs">Waktu Eksekusi</span>
                <span className="font-semibold text-slate-900">
                  {new Date(selectedLog.created_at).toLocaleString('id-ID')}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">Status Eksekusi</span>
                <span className={`font-semibold ${selectedLog.status === 'SUCCESS' ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {selectedLog.status === 'SUCCESS' ? 'Berhasil (SUCCESS)' : 'Gagal (FAILED)'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">Aktivitas</span>
                <span className="font-semibold text-slate-900">{getHumanAction(selectedLog.action, selectedLog.resource).title}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">Modul / Resource</span>
                <span className="font-mono text-slate-900">{selectedLog.resource || '-'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 block text-xs">Aksi Lengkap / Route</span>
                <span className="font-mono text-xs text-indigo-700 break-all">{selectedLog.action}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">Alamat IP Klien</span>
                <span className="font-mono text-slate-900">{selectedLog.ip_address || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">ID Pengguna</span>
                <span className="font-mono text-xs text-slate-900 truncate block" title={selectedLog.user_id}>
                  {selectedLog.user_id || 'Anonim / Publik'}
                </span>
              </div>
              {selectedLog.user_agent && (
                <div className="col-span-2">
                  <span className="text-slate-500 block text-xs">User Agent</span>
                  <span className="font-mono text-[11px] text-slate-600 break-all">{selectedLog.user_agent}</span>
                </div>
              )}
              {selectedLog.error_message && (
                <div className="col-span-2 p-2 bg-rose-50 border border-rose-200 rounded text-rose-800">
                  <span className="block text-xs font-bold">Pesan Error:</span>
                  <span className="font-mono text-xs">{selectedLog.error_message}</span>
                </div>
              )}
            </div>

            <div>
              <span className="text-xs font-bold text-slate-700 block mb-1">Payload & Data Perubahan</span>
              <pre className="bg-slate-950 text-slate-100 p-3 rounded-lg text-xs font-mono overflow-x-auto max-h-60">
                {selectedLog.payload ? JSON.stringify(selectedLog.payload, null, 2) : '// Tidak ada payload request tambahan'}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedLog(null)}>
                Tutup
              </Button>
            </div>
          </div>
        </SimpleDialog>
      )}
    </div>
  );
}
