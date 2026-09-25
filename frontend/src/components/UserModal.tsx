import React, { useState, useEffect } from 'react';
import { SimpleDialog } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select } from './ui/select';
import { SearchableResidentSelect } from './ui/SearchableResidentSelect';
import { useResidents } from '../services/resident';
import { UserWithRole, RoleName } from '../services/user';
import type { Tenant } from '../types/auth';
import { UserCheck } from 'lucide-react';

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
    resident_id?: string;
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
  const [selectedResidentId, setSelectedResidentId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Ambil data warga untuk auto-fill jika modal dibuka
  const { data: residentsData } = useResidents({ limit: 100 });
  const residentsList = residentsData?.data || [];

  const residentOptions = React.useMemo(() => {
    const list: Array<{
      id: string;
      full_name: string;
      nik?: string;
      phone?: string;
      house_number?: string;
    }> = [];

    residentsList.forEach((r) => {
      // Masukkan Kepala Keluarga / Warga Utama
      list.push({
        id: r.id,
        full_name: r.full_name || 'Tanpa Nama',
        nik: r.nik || '',
        phone: r.phone || '',
        house_number: r.address || '',
      });

      // Masukkan seluruh anggota keluarga (anak/istri/famili)
      if (r.family_members && r.family_members.length > 0) {
        r.family_members.forEach((fm: any) => {
          list.push({
            id: fm.id,
            full_name: `${fm.full_name} (${fm.relation || 'Anggota KK'} dari ${r.full_name})`,
            nik: fm.nik || '',
            phone: r.phone || '',
            house_number: r.address || '',
          });
        });
      }
    });

    return list;
  }, [residentsList]);

  const handleSelectResident = (residentId: string) => {
    setSelectedResidentId(residentId);
    if (!residentId) return;

    // Cari di warga utama
    let foundName = '';
    let foundPhone = '';

    for (const r of residentsList) {
      if (r.id === residentId) {
        foundName = r.full_name || '';
        foundPhone = r.phone || '';
        break;
      }
      if (r.family_members) {
        const fm = r.family_members.find((f: any) => f.id === residentId);
        if (fm) {
          foundName = fm.full_name || '';
          foundPhone = r.phone || '';
          break;
        }
      }
    }

    if (foundName) {
      setName(foundName);
      if (foundPhone) setPhone(foundPhone);
      if (!email && !user) {
        const cleanName = foundName.toLowerCase().replace(/[^a-z0-9]/g, '.');
        setEmail(`${cleanName}@warga.local`);
      }
    }
  };

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setPhone(user.phone || '');
      setRole(user.role_name);
      setTenantId(user.tenant_id || defaultTenantId || (tenants.length > 0 ? tenants[0].id : ''));
      setPassword('');
      setSelectedResidentId(user.resident_id || '');
    } else {
      setName('');
      setEmail('');
      setPhone('');
      setRole('resident');
      setTenantId(defaultTenantId || (tenants.length > 0 ? tenants[0].id : ''));
      setPassword('');
      setSelectedResidentId('');
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
        tenant_id: isSuperAdmin && role !== 'superadmin' ? tenantId || undefined : undefined,
        resident_id: selectedResidentId || undefined,
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
      className="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <div className="p-3.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1d1d1f]">
            <UserCheck className="w-4 h-4 text-[#0071e3]" />
            {user ? 'Tautkan / Ubah Tautan Data Warga' : 'Tautkan ke Data Warga Terdaftar (Auto-fill)'}
          </div>
          <SearchableResidentSelect
            residents={residentOptions}
            value={selectedResidentId}
            onChange={handleSelectResident}
            placeholder="Cari nama warga, NIK, atau nomor rumah..."
          />
          <p className="text-[11px] text-[#86868b]">
            {user
              ? 'Tautkan akun ini ke profil kependudukan warga agar hak kelola data dan sensus terhubung.'
              : 'Pilih warga untuk mengisi otomatis Nama Lengkap dan Nomor HP/WA secara akurat.'}
          </p>
        </div>

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

        {isSuperAdmin && role !== 'superadmin' && (
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
            <option value="operator">Operator (Staf Operasional RT)</option>
            <option value="admin_rt">Admin RT (Pengurus Inti)</option>
            {isSuperAdmin && <option value="superadmin">Super Admin</option>}
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
