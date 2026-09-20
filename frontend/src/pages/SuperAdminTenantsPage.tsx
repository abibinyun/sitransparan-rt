import React, { useState } from 'react';
import { useTenantsQuery, useCreateTenantMutation, useUpdateTenantMutation, useDeleteTenantMutation } from '../services/tenant';
import { useSwitchTenantMutation } from '../services/auth';
import { useAuthStore } from '../store/useAuthStore';
import type { Tenant } from '../types/auth';
import { SimpleDialog } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/table';
import { getTenantBaseDomain, getTenantUrl } from '../utils/tenant';
import { LogIn } from 'lucide-react';

export const SuperAdminTenantsPage: React.FC = () => {
  const { data: tenants, isLoading, isError, refetch } = useTenantsQuery();
  const createMutation = useCreateTenantMutation();
  const updateMutation = useUpdateTenantMutation();
  const deleteMutation = useDeleteTenantMutation();
  const switchTenantMutation = useSwitchTenantMutation();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [domain, setDomain] = useState('');
  const baseDomain = getTenantBaseDomain();

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingTenant) {
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generatedSlug);
    }
  };

  const openCreateModal = () => {
    setEditingTenant(null);
    setName('');
    setSlug('');
    setDomain('');
    setIsModalOpen(true);
  };

  const openEditModal = (t: Tenant) => {
    setEditingTenant(t);
    setName(t.name);
    setSlug(t.slug);
    setDomain(t.domain || '');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[SuperAdminTenants] handleSave called', { name, slug, domain, editingTenant });
    if (!name || !slug) return;

    if (editingTenant) {
      updateMutation.mutate(
        { id: editingTenant.id, name, slug, domain: domain || undefined },
        {
          onSuccess: () => {
            setIsModalOpen(false);
            refetch();
          },
          onError: (err: any) => {
            console.error('Update tenant error:', err);
            alert(err?.response?.data?.error || err?.message || 'Gagal memperbarui tenant');
          },
        }
      );
    } else {
      createMutation.mutate(
        { name, slug, domain: domain || undefined },
        {
          onSuccess: () => {
            setIsModalOpen(false);
            refetch();
          },
          onError: (err: any) => {
            console.error('Create tenant error data:', err?.response?.data);
            alert(err?.response?.data?.error || err?.message || 'Gagal membuat tenant');
          },
        }
      );
    }
  };

  const handleEnterTenant = async (tenant: Tenant) => {
    try {
      const switched = await switchTenantMutation.mutateAsync(tenant.id);
      const tenantsList = tenants || [];
      const userWithRole = { ...switched.user, role: (switched.user.role || 'SUPER_ADMIN') as any, tenants: tenantsList };
      setAuth(switched.token, userWithRole as any, tenant);
      window.location.href = getTenantUrl(tenant.slug, '/admin');
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Gagal masuk tenant');
    }
  };

  const handleToggleStatus = (tenant: Tenant) => {
    const isCurrentlyActive = tenant.status !== 'inactive';
    const newStatus = isCurrentlyActive ? 'inactive' : 'active';
    const actionLabel = isCurrentlyActive ? 'menonaktifkan' : 'mengaktifkan kembali';

    if (confirm(`Apakah Anda yakin ingin ${actionLabel} Tenant "${tenant.name}"?`)) {
      updateMutation.mutate(
        {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          domain: tenant.domain || undefined,
          status: newStatus,
        },
        {
          onSuccess: () => refetch(),
          onError: (err: any) => {
            alert(err?.response?.data?.error || err?.message || `Gagal ${actionLabel} tenant`);
          },
        }
      );
    }
  };

  const handleDelete = (tenant: Tenant) => {
    if (tenant.status !== 'inactive') {
      alert('Tenant harus dinonaktifkan terlebih dahulu sebelum dapat dihapus.');
      return;
    }

    if (confirm(`Apakah Anda yakin ingin menghapus Tenant "${tenant.name}"? Tindakan ini akan mengarsipkan tenant.`)) {
      deleteMutation.mutate(tenant.id, {
        onSuccess: () => refetch(),
        onError: (err: any) => {
          alert(err?.response?.data?.error || err?.message || 'Gagal menghapus tenant');
        },
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manajemen Tenant RT</h2>
          <p className="text-sm text-gray-500 mt-1">SuperAdmin Panel: Kelola pendaftaran & data Tenant RT</p>
        </div>
        <Button onClick={openCreateModal}>
          + Pendaftaran RT Baru
        </Button>
      </div>

      <div className="rounded-lg bg-white shadow-sm border border-[#d2d2d7] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#d2d2d7] flex justify-between items-center bg-[#f5f5f7]">
          <h3 className="text-base font-semibold text-[#1d1d1f]">Daftar Tenant RT Terdaftar</h3>
          <span className="text-xs bg-[#f4f8fb] text-[#0066cc] border border-[#d2d2d7] font-semibold px-2.5 py-0.5 rounded-full">
            Total: {tenants?.length || 0} RT
          </span>
        </div>
        {isLoading ? (
          <div className="p-6 text-sm text-gray-500 text-center">Memuat daftar tenant...</div>
        ) : isError ? (
          <div className="p-6 text-sm text-red-500 text-center">Gagal memuat daftar tenant.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama RT</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Slug (Identifier)</TableHead>
                <TableHead>Domain (Default / Custom)</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants && tenants.length > 0 ? (
                tenants.map((t) => {
                  const isActive = t.status !== 'inactive';
                  return (
                    <TableRow key={t.id} className={!isActive ? 'bg-slate-50 opacity-80' : ''}>
                      <TableCell className="font-semibold text-[#1d1d1f]">
                        {t.name}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              isActive ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                          />
                          {isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-[#0066cc]">{t.slug}</TableCell>
                      <TableCell className="font-mono text-xs text-[#707070]">{t.domain || `${t.slug}.${baseDomain}`}</TableCell>
                      <TableCell className="text-right space-x-2">
                        {isActive && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEnterTenant(t)}
                            disabled={switchTenantMutation.isPending}
                            className="text-[#0066cc] border-[#d2d2d7] hover:bg-[#f4f8fb] gap-1"
                            title="Masuk sebagai superadmin ke tenant ini"
                          >
                            <LogIn className="h-3.5 w-3.5" /> Masuk
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(t)}
                          className="text-[#1d1d1f] hover:text-[#0071e3]"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(t)}
                          disabled={updateMutation.isPending}
                          className={
                            isActive
                              ? 'text-amber-700 border-amber-200 hover:bg-amber-50'
                              : 'text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                          }
                          title={isActive ? 'Nonaktifkan akses tenant' : 'Aktifkan kembali tenant'}
                        >
                          {isActive ? 'Nonaktifkan' : 'Aktifkan'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(t)}
                          disabled={deleteMutation.isPending || isActive}
                          title={isActive ? 'Nonaktifkan tenant terlebih dahulu sebelum menghapus' : 'Hapus tenant'}
                          className={isActive ? 'opacity-40 cursor-not-allowed' : ''}
                        >
                          Hapus
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="px-6 py-8 text-center text-sm text-[#707070]">
                    Belum ada tenant RT terdaftar.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <SimpleDialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTenant ? 'Edit Tenant RT' : 'Pendaftaran RT Baru'}
        description={editingTenant ? 'Perbarui informasi tenant RT' : 'Daftarkan tenant RT baru ke dalam sistem'}
        className="max-w-3xl"
      >
        <form id="tenant-form" onSubmit={handleSave} data-testid="tenant-form" className="space-y-4">
          <div>
            <label htmlFor="tenant-name" className="block text-sm font-medium text-gray-700">Nama RT</label>
            <Input
              id="tenant-name"
              data-testid="tenant-name-input"
              type="text"
              required
              placeholder="e.g. RT 01 RW 05 Melati"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label htmlFor="tenant-slug" className="block text-sm font-medium text-gray-700">Slug (ID URL / Header)</label>
            <Input
              id="tenant-slug"
              data-testid="tenant-slug-input"
              type="text"
              required
              placeholder="e.g. rt-01-rw-05"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="mt-1 font-mono text-sm"
            />
          </div>
          <div>
            <label htmlFor="tenant-domain" className="block text-sm font-medium text-gray-700">Custom Domain (Opsional)</label>
            <Input
              id="tenant-domain"
              data-testid="tenant-domain-input"
              type="text"
              placeholder={slug ? `${slug}.${baseDomain} (Default Subdomain)` : 'e.g. rt01.perumahan.com'}
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Jika dikosongkan, domain otomatis diassign ke: <code className="text-indigo-600 font-mono">{slug ? `${slug}.${baseDomain}` : `<slug>.${baseDomain}`}</code>
            </p>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              form="tenant-form"
              data-testid="save-tenant-btn"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? 'Menyimpan...' : 'Simpan Tenant'}
            </Button>
          </div>
        </form>
      </SimpleDialog>
    </div>
  );
};
