import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoginMutation, useRegisterMutation } from '../services/auth';
import { useAuthStore } from '../store/useAuthStore';
import type { Role, Tenant } from '../types/auth';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select } from '../components/ui/select';
import { Building2, KeyRound, Mail, User, Phone, CheckCircle2, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [pendingAuth, setPendingAuth] = useState<{ token: string; user: any } | null>(null);

  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const loginMutation = useLoginMutation();
  const registerMutation = useRegisterMutation();

  const switchMode = (nextMode: 'login' | 'register') => {
    setMode(nextMode);
    setRegisterSuccess('');
    loginMutation.reset();
    registerMutation.reset();
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(
      { email, password },
      {
        onSuccess: (data) => {
          if (data.user.tenants && data.user.tenants.length > 1) {
            setPendingAuth({ token: data.token, user: data.user });
            setAvailableTenants(data.user.tenants);
            setSelectedTenantId(data.user.tenants[0].id);
          } else {
            const userWithRole = {
              ...data.user,
              role: (data.user.role || (data.user.email === 'admin@gmail.com' || data.user.email === 'superadmin@platform.local' ? 'SUPER_ADMIN' : 'RT_ADMIN')) as Role,
            };
            const initialTenant = userWithRole.tenants?.[0] || null;
            setAuth(data.token, userWithRole, initialTenant);
            const isSuperAdmin = userWithRole.role === 'SUPER_ADMIN' || (userWithRole.role as string) === 'superadmin';
            navigate(isSuperAdmin ? '/superadmin/tenants' : '/');
          }
        },
      }
    );
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterSuccess('');
    registerMutation.mutate(
      { name, email, password, phone: phone.trim() || undefined },
      {
        onSuccess: () => {
          setRegisterSuccess('Pendaftaran berhasil. Silakan login menggunakan akun baru Anda.');
          setMode('login');
          setPassword('');
          setPhone('');
        },
      }
    );
  };

  const handleTenantSelectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingAuth) return;
    const selected = availableTenants.find((t) => t.id === selectedTenantId) || null;
    setAuth(pendingAuth.token, pendingAuth.user, selected);
    navigate(pendingAuth.user.role === 'SUPER_ADMIN' ? '/superadmin/tenants' : '/');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-slate-200/80">
        <CardHeader className="text-center space-y-2 pb-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
            <Building2 className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">
            {pendingAuth ? 'Pilih RT / Tenant' : mode === 'login' ? 'Masuk ke Sitransparan RT' : 'Daftar Akun'}
          </CardTitle>
          <CardDescription>
            {pendingAuth
              ? 'Pilih perumahan / RT aktif untuk memulai session'
              : mode === 'login'
              ? 'Kelola lingkungan RT/RW secara efisien dan transparan'
              : 'Buat akun warga atau admin perumahan baru'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {!pendingAuth && (
            <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm font-medium">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`rounded-md py-2 text-center transition-all ${
                  mode === 'login' ? 'bg-white text-indigo-600 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => switchMode('register')}
                className={`rounded-md py-2 text-center transition-all ${
                  mode === 'register' ? 'bg-white text-indigo-600 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Daftar
              </button>
            </div>
          )}

          {registerSuccess && (
            <div className="flex items-center space-x-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{registerSuccess}</span>
            </div>
          )}

          {(loginMutation.isError || registerMutation.isError) && (
            <div className="flex items-center space-x-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                {(loginMutation.error as any)?.response?.data?.error ||
                  (registerMutation.error as any)?.response?.data?.error ||
                  'Terjadi kesalahan saat otentikasi.'}
              </span>
            </div>
          )}

          {pendingAuth ? (
            <form onSubmit={handleTenantSelectSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tenantSelect">Pilih Lingkungan RT</Label>
                <Select
                  id="tenantSelect"
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  required
                >
                  {availableTenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code || (t as any).slug || ''})
                    </option>
                  ))}
                </Select>
              </div>

              <Button type="submit" className="w-full" size="lg">
                Lanjutkan
              </Button>
            </form>
          ) : mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="loginEmail">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="loginEmail"
                    type="email"
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="loginPassword">Kata Sandi</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="loginPassword"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full font-semibold"
                size="lg"
              >
                {loginMutation.isPending ? 'Memproses...' : 'Masuk Akun'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="regName">Nama Lengkap</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="regName"
                    type="text"
                    placeholder="Budi Santoso"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="regEmail">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="regEmail"
                    type="email"
                    placeholder="budi@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="regPassword">Kata Sandi</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="regPassword"
                    type="password"
                    placeholder="Minimal 6 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="regPhone">Nomor Telepon / WhatsApp</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="regPhone"
                    type="tel"
                    placeholder="081234567890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={registerMutation.isPending}
                className="w-full font-semibold"
                size="lg"
              >
                {registerMutation.isPending ? 'Mendaftarkan...' : 'Daftar Akun'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
