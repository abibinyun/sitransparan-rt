import React, { useState, useEffect } from 'react';
import { SimpleDialog } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select } from './ui/select';
import { UserWithRole, RoleName } from '../services/user';
import type { Tenant } from '../types/auth';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    email: string;
    password?: string;
    phone?: string;
    role: RoleName;
    tenant_id?: string;
  }) => Promise<void>;
  user?: UserWithRole | null;
  isLoading?: boolean;
  isSuperAdmin?: boolean;
  tenants?: Tenant[];
  defaultTenantId?: string;
}

export const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  user,
  isLoading,
  isSuperAdmin,
  tenants = [],
  defaultTenantId,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<RoleName>('resident');
  const [tenantId, setTenantId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setPhone(user.phone || '');
      setRole(user.role_name);
      setTenantId(user.tenant_id || defaultTenantId || (tenants.length > 0 ? tenants[0].id : ''));
      setPassword('');
    } else {
      setName('');
      setEmail('');
      setPhone('');
      setRole('resident');
      setTenantId(defaultTenantId || (tenants.length > 0 ? tenants[0].id : ''));
      setPassword('');
    }
    setError(null);
  }, [user, isOpen, defaultTenantId, tenants]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      setError('Nama dan Email wajib diisi');
      return;
    }

    if (!user && !password) {
      setError('Password wajib diisi untuk pengguna baru');
      return;
    }

    try {
      await onSubmit({
        name,
        email,
        phone: phone || undefined,
        role,
        password: password || undefined,
        tenant_id: isSuperAdmin ? tenantId || undefined : undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal menyimpan data pengguna');
    }
  };

  return (
    <SimpleDialog
      isOpen={isOpen}
      onClose={onClose}
      title={user ? 'Edit Pengguna' : 'Tambah Pengguna'}
      description={user ? 'Ubah informasi pengguna dan peran.' : 'Tambahkan pengguna baru ke sistem.'}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="name">Nama Lengkap *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Budi Santoso"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="budi@example.com"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Nomor HP / WA</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="08123456789"
          />
        </div>

        {isSuperAdmin && (
          <div className="space-y-1.5">
            <Label htmlFor="tenant_id">Tenant RT *</Label>
            <Select
              id="tenant_id"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              required
            >
              <option value="">-- Pilih Tenant RT --</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.slug})
                </option>
              ))}
            </Select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="role">Peran / Hak Akses *</Label>
          <Select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as RoleName)}
          >
            <option value="resident">Warga (Resident)</option>
            <option value="admin_rt">Admin RT</option>
            <option value="superadmin">Super Admin</option>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">
            Password {user ? '(Kosongkan jika tidak diubah)' : '*'}
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={user ? '••••••••' : 'Masukkan password'}
            required={!user}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </div>
      </form>
    </SimpleDialog>
  );
};
