import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ShieldCheck, Search, RefreshCw, AlertCircle, ArrowLeft, ArrowRight, Users } from 'lucide-react';
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

export function AuditLogsPage() {
  const [searchAction, setSearchAction] = useState('');
  const [selectedResource] = useState('');
  const [page, setPage] = useState(1);
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
                placeholder="Cari aksi (POST, DELETE, verify, dll)..."
                value={searchAction}
                onChange={(e) => {
                  setSearchAction(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Total <b>{data?.total || 0}</b> aksi terekam
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
                    <TableHead className="w-[180px]">Waktu</TableHead>
                    <TableHead>Aksi / Endpoint</TableHead>
                    <TableHead>Modul</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>IP & Client</TableHead>
                    <TableHead className="max-w-[200px]">Detail Payload</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((log: AuditLog) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('id-ID')}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-xs font-mono">{log.action}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {log.resource || 'general'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={log.status === 'SUCCESS' ? 'default' : 'destructive'}
                          className="text-xs font-semibold"
                        >
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        <div>{log.ip_address || '-'}</div>
                      </TableCell>
                      <TableCell className="text-xs font-mono max-w-[200px] truncate text-muted-foreground" title={JSON.stringify(log.payload, null, 2)}>
                        {log.payload ? JSON.stringify(log.payload) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
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
    </div>
  );
}
