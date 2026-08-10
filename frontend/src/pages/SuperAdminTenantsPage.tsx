import React, { useState } from 'react';
import { useTenantsQuery, useCreateTenantMutation, useUpdateTenantMutation, useDeleteTenantMutation } from '../services/tenant';
import type { Tenant } from '../types/auth';
import { SimpleDialog } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

export const SuperAdminTenantsPage: React.FC = () => {
  const { data: tenants, isLoading, isError, refetch } = useTenantsQuery();
  const createMutation = useCreateTenantMutation();
  const updateMutation = useUpdateTenantMutation();
  const deleteMutation = useDeleteTenantMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [domain, setDomain] = useState('');

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
    if (!name || !slug) return;

    if (editingTenant) {
      updateMutation.mutate(
        { id: editingTenant.id, name, slug, domain: domain || undefined },
        {
          onSuccess: () => {
            setIsModalOpen(false);
            refetch();
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
        }
      );
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus Tenant RT ini?')) {
      deleteMutation.mutate(id, {
        onSuccess: () => refetch(),
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
        <Button onClick={openCreateModal} className="bg-indigo-600 hover:bg-indigo-700 text-white">
          + Pendaftaran RT Baru
        </Button>
      </div>

      <div className="rounded-lg bg-white shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800">Daftar Tenant RT Terdaftar</h3>
          <span className="text-xs bg-indigo-100 text-indigo-700 font-medium px-2.5 py-1 rounded-full">
            Total: {tenants?.length || 0} RT
          </span>
        </div>
        {isLoading ? (
          <div className="p-6 text-sm text-gray-500 text-center">Memuat daftar tenant...</div>
        ) : isError ? (
          <div className="p-6 text-sm text-red-500 text-center">Gagal memuat daftar tenant.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama RT</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slug (Identifier)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Custom Domain</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tenants && tenants.length > 0 ? (
                  tenants.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{t.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-indigo-600">{t.slug}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.domain || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(t)}
                          className="text-gray-700 hover:text-indigo-600"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(t.id)}
                          disabled={deleteMutation.isPending}
                        >
                          Hapus
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                      Belum ada tenant RT terdaftar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SimpleDialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTenant ? 'Edit Tenant RT' : 'Pendaftaran RT Baru'}
        description={editingTenant ? 'Perbarui informasi tenant RT' : 'Daftarkan tenant RT baru ke dalam sistem'}
      >
        <form onSubmit={handleSave} className="space-y-4 pt-2">
          <div>
            <label htmlFor="tenant-name" className="block text-sm font-medium text-gray-700">Nama RT</label>
            <Input
              id="tenant-name"
              type="text"
              required
              placeholder="e.g. RT 01 RW 05 Melati"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!editingTenant) {
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                }
              }}
              className="mt-1"
            />
          </div>
          <div>
            <label htmlFor="tenant-slug" className="block text-sm font-medium text-gray-700">Slug (ID URL / Header)</label>
            <Input
              id="tenant-slug"
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
              type="text"
              placeholder="e.g. rt01.perumahan.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {createMutation.isPending || updateMutation.isPending ? 'Menyimpan...' : 'Simpan Tenant'}
            </Button>
          </div>
        </form>
      </SimpleDialog>
    </div>
  );
};
