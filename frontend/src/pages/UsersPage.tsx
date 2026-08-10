import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Phone, Mail } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { SimpleDialog } from '../components/ui/dialog';
import { UserModal } from '../components/UserModal';
import { useAuthStore } from '../store/useAuthStore';
import { useTenantsQuery } from '../services/tenant';
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  UserWithRole,
  RoleName,
} from '../services/user';

export const UsersPage: React.FC = () => {
  const { user, activeTenant } = useAuthStore();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'superadmin';
  const { data: tenants = [] } = useTenantsQuery({ enabled: isSuperAdmin });

  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  const limit = 10;
  const offset = (page - 1) * limit;

  const { data, isLoading, error } = useUsers(limit, offset);
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const handleOpenAdd = () => {
    setSelectedUser(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: UserWithRole) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleSubmit = async (formData: {
    name: string;
    email: string;
    password?: string;
    phone?: string;
    role: RoleName;
    tenant_id?: string;
  }) => {
    if (selectedUser) {
      await updateUser.mutateAsync({
        id: selectedUser.id,
        payload: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          password: formData.password,
          tenant_id: formData.tenant_id,
        },
      });
    } else {
      await createUser.mutateAsync({
        name: formData.name,
        email: formData.email,
        password: formData.password!,
        phone: formData.phone,
        role: formData.role,
        tenant_id: formData.tenant_id,
      });
    }
  };

  const handleDelete = async () => {
    if (deleteUserId) {
      await deleteUser.mutateAsync(deleteUserId);
      setDeleteUserId(null);
    }
  };

  const filteredUsers = (data?.data || []).filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadge = (role: RoleName) => {
    switch (role) {
      case 'superadmin':
        return <Badge variant="destructive" className="bg-red-500/10 text-red-600 hover:bg-red-500/20">Super Admin</Badge>;
      case 'admin_rt':
        return <Badge variant="default" className="bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20">Admin RT</Badge>;
      default:
        return <Badge variant="secondary" className="bg-slate-100 text-slate-700">Warga</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Manajemen Pengguna</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola daftar pengguna, peranan, dan hak akses sistem.</p>
        </div>
        <Button onClick={handleOpenAdd} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4" />
          Tambah Pengguna
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cari nama atau email pengguna..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-slate-50 border-slate-200"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50">
              <TableHead>Pengguna</TableHead>
              <TableHead>Kontak</TableHead>
              <TableHead>Peran</TableHead>
              {isSuperAdmin && <TableHead>Tenant / RT</TableHead>}
              <TableHead>Tanggal Dibuat</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  {isSuperAdmin && <TableCell><Skeleton className="h-6 w-24" /></TableCell>}
                  <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell colSpan={isSuperAdmin ? 6 : 5} className="text-center py-8 text-red-500">
                  Gagal memuat data pengguna. Silakan coba lagi.
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isSuperAdmin ? 6 : 5} className="text-center py-8 text-slate-500">
                  Tidak ada pengguna ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((u) => (
                <TableRow key={u.id} className="hover:bg-slate-50/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-semibold text-sm">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{u.name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {u.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {u.phone ? (
                      <span className="text-sm text-slate-600 flex items-center gap-1">
                        <Phone className="h-3 w-3 text-slate-400" /> {u.phone}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 italic">-</span>
                    )}
                  </TableCell>
                  <TableCell>{getRoleBadge(u.role_name)}</TableCell>
                  {isSuperAdmin && (
                    <TableCell>
                      {u.tenant_name ? (
                        <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                          {u.tenant_name}
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-400 italic">System Global</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell className="text-sm text-slate-500">
                    {new Date(u.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(u)}
                        className="h-8 w-8 p-0 hover:bg-slate-100"
                      >
                        <Edit2 className="h-4 w-4 text-slate-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteUserId(u.id)}
                        className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {data && data.total > limit && (
          <div className="flex items-center justify-between p-4 border-t border-slate-200 text-sm">
            <span className="text-slate-500">
              Menampilkan {offset + 1} - {Math.min(offset + limit, data.total)} dari {data.total} data
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={offset + limit >= data.total}
                onClick={() => setPage((p) => p + 1)}
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        )}
      </div>

      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        user={selectedUser}
        isLoading={createUser.isPending || updateUser.isPending}
        isSuperAdmin={isSuperAdmin}
        tenants={tenants}
        defaultTenantId={activeTenant?.id}
      />

      <SimpleDialog
        isOpen={!!deleteUserId}
        onClose={() => setDeleteUserId(null)}
        title="Hapus Pengguna"
        description="Apakah Anda yakin ingin menghapus pengguna ini? Tindakan ini tidak dapat dibatalkan."
      >
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => setDeleteUserId(null)}>
            Batal
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteUser.isPending}
          >
            {deleteUser.isPending ? 'Mengahpus...' : 'Hapus'}
          </Button>
        </div>
      </SimpleDialog>
    </div>
  );
};
