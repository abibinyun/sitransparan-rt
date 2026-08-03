import React, { useState } from 'react';
import { useTenantsQuery, useCreateTenantMutation, useDeleteTenantMutation } from '../services/tenant';

export const SuperAdminTenantsPage: React.FC = () => {
  const { data: tenants, isLoading, isError, refetch } = useTenantsQuery();
  const createMutation = useCreateTenantMutation();
  const deleteMutation = useDeleteTenantMutation();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) return;
    createMutation.mutate(
      { name, code },
      {
        onSuccess: () => {
          setName('');
          setCode('');
          refetch();
        },
      }
    );
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this tenant?')) {
      deleteMutation.mutate(id, {
        onSuccess: () => refetch(),
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">SuperAdmin: CRUD Tenant & Register RT Baru</h2>
      </div>

      <form onSubmit={handleCreate} className="rounded-lg bg-white p-6 shadow-sm border border-gray-200 space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Register RT Baru</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nama RT</label>
            <input
              type="text"
              required
              placeholder="e.g. RT 01 RW 05"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Kode RT</label>
            <input
              type="text"
              required
              placeholder="e.g. RT0105"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {createMutation.isPending ? 'Registering...' : 'Register RT'}
        </button>
      </form>

      <div className="rounded-lg bg-white shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Daftar Tenant RT</h3>
        </div>
        {isLoading ? (
          <div className="p-6 text-sm text-gray-500">Loading tenants...</div>
        ) : isError ? (
          <div className="p-6 text-sm text-red-500">Failed to load tenants.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama RT</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kode</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tenants && tenants.length > 0 ? (
                tenants.map((t) => (
                  <tr key={t.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{t.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                    Belum ada tenant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
