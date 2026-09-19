import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLoginMutation, useRegisterMutation, useSwitchTenantMutation, fetchUserTenantsWithToken } from '../services/auth';
import { useAuthStore } from '../store/useAuthStore';
import { getTenantSlugFromHost, getTenantUrl, getPlatformUrl } from '../utils/tenant';
import type { Role, Tenant } from '../types/auth';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select } from '../components/ui/select';
import { Building2, KeyRound, Mail, User, Phone, CheckCircle2, AlertCircle } from 'lucide-react';
import { PublicBottomNav } from '../components/PublicBottomNav';
import { usePublicTenantQuery } from '../services/public_tenant';
import { TenantNotFoundPage } from '../components/TenantNotFoundPage';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const { setAuth, token, user } = useAuthStore();

  const hostTenantSlug = getTenantSlugFromHost();
  const { data: tenantInfo, isLoading: isTenantLoading, isError: isTenantError } = usePublicTenantQuery();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [authError, setAuthError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [pendingAuth, setPendingAuth] = useState<{ token: string; user: any } | null>(null);

  const loginMutation = useLoginMutation();
  const registerMutation = useRegisterMutation();
  const switchTenantMutation = useSwitchTenantMutation();

  useEffect(() => {
    if (token && user) {
      if (returnTo) {
        navigate(returnTo, { replace: true });
      } else {
        const isSuperAdmin =
          user.role === 'SUPER_ADMIN' ||
          (user.role as string) === 'superadmin' ||
          (user.role as string) === 'super_admin';
        navigate(isSuperAdmin ? '/admin/tenants' : '/admin', { replace: true });
      }
    }
  }, [token, user, navigate, returnTo]);

  // Jika user mengakses halaman login pada subdomain tenant
  if (hostTenantSlug) {
    if (isTenantLoading) {
      return (
        <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-[#0071e3]/20 border-t-[#0071e3] animate-spin"></div>
        </div>
      );
    }
    if (isTenantError || !tenantInfo) {
      return <TenantNotFoundPage />;
    }
  }

  const switchMode = (nextMode: 'login' | 'register') => {
    setMode(nextMode);
    setRegisterSuccess('');
    loginMutation.reset();
    registerMutation.reset();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const data = await loginMutation.mutateAsync({ email, password });

      // The role comes from the backend JWT (derived from the DB mapping); it
      // is never guessed from the email address.
      const userWithRole = {
        ...data.user,
        role: (data.user.role || 'RESIDENT') as Role,
      };

      // Attach the user's real tenant list from the verified identity so the
      // tenant switcher and tenant selection work with server truth.
      const tenants = await fetchUserTenantsWithToken(data.token);
      userWithRole.tenants = tenants;

      // When the user arrives on a tenant subdomain (e.g. rt-003.openrt.local),
      // prefer the tenant matching that hostname so the session starts scoped to
      // the RT they navigated to. The backend still enforces the hostname/JWT
      // match on every protected call, so an unregistered or foreign hostname
      // can never grant access to another tenant.
      const hostTenantSlug = getTenantSlugFromHost();
      const hostTenant = hostTenantSlug ? tenants.find((t) => t.slug === hostTenantSlug) : undefined;

      const isSuperAdmin =
        userWithRole.role === 'SUPER_ADMIN' ||
        (userWithRole.role as string) === 'superadmin' ||
        (userWithRole.role as string) === 'super_admin';

      if (tenants.length > 1 && !isSuperAdmin) {
        setPendingAuth({ token: data.token, user: userWithRole });
        setAvailableTenants(tenants);
        setSelectedTenantId(hostTenant ? hostTenant.id : tenants[0].id);
        return;
      }

      const initialTenant = hostTenant || tenants[0] || null;
      setAuth(data.token, userWithRole, initialTenant);

      // Only cross-origin redirect if host is truly different and not running on generic localhost
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isSuperAdmin) {
        if (hostTenantSlug && !isLocalhost) {
          window.location.href = getPlatformUrl(`/admin/tenants?token=${encodeURIComponent(data.token)}`);
          return;
        }
        // Hard reload to purge stale role/memo (fix mix-match superadmin↔tenant)
        window.location.href = '/admin/tenants';
        return;
      }

      if (initialTenant && initialTenant.slug !== hostTenantSlug && !isLocalhost) {
        window.location.href = getTenantUrl(initialTenant.slug, `/admin?token=${encodeURIComponent(data.token)}`);
        return;
      }

      window.location.href = '/admin';
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        'Invalid email or password';
      setAuthError(msg);
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterSuccess('');
    const hostTenantSlug = getTenantSlugFromHost();
    registerMutation.mutate(
      { name, email, password, phone: phone.trim() || undefined },
      {
        onSuccess: () => {
          if (hostTenantSlug) {
            setRegisterSuccess(
              `Pendaftaran berhasil untuk RT ${hostTenantSlug.toUpperCase()}. Silakan login, akun Anda akan diverifikasi oleh Pengurus RT.`
            );
          } else {
            setRegisterSuccess('Pendaftaran berhasil. Silakan login menggunakan akun baru Anda.');
          }
          setMode('login');
          setPassword('');
          setPhone('');
        },
      }
    );
  };

  const handleTenantSelectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingAuth) return;
    const selected = availableTenants.find((t) => t.id === selectedTenantId) || null;
    if (!selected) return;
    try {
      // Re-issue the token scoped to the chosen tenant (server-verified).
      const switched = await switchTenantMutation.mutateAsync(selected.id);
      const userWithRole = {
        ...switched.user,
        role: (switched.user.role || pendingAuth.user.role) as Role,
        tenants: availableTenants,
      };
      setAuth(switched.token, userWithRole, selected);
      const isSuperAdmin =
        userWithRole.role === 'SUPER_ADMIN' ||
        (userWithRole.role as string) === 'superadmin' ||
        (userWithRole.role as string) === 'super_admin';

      const hostTenantSlug = getTenantSlugFromHost();
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isSuperAdmin) {
        if (hostTenantSlug && !isLocalhost) {
          window.location.href = getPlatformUrl('/admin/tenants');
          return;
        }
        // Hard reload to purge stale role/memo (fix mix-match superadmin↔tenant)
        window.location.href = '/admin/tenants';
        return;
      }

      if (selected.slug !== hostTenantSlug && !isLocalhost) {
        window.location.href = getTenantUrl(selected.slug, '/admin');
        return;
      }

      window.location.href = '/admin';
    } catch {
      // error surfaced via switchTenantMutation.isError below
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 pb-20 md:pb-4">
      <Card className="w-full max-w-md shadow-xl border-slate-200/80">
        <CardHeader className="text-center space-y-2 pb-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
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
          {/* Mode Switcher: Tab Masuk & Daftar Akun */}
          {!pendingAuth && (
            <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm font-medium">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`rounded-md py-2 text-center transition-all ${
                  mode === 'login' ? 'bg-white text-emerald-700 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => switchMode('register')}
                className={`rounded-md py-2 text-center transition-all ${
                  mode === 'register' ? 'bg-white text-emerald-700 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
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

          {(authError || loginMutation.isError || registerMutation.isError) && (
            <div className="flex items-center space-x-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                {authError ||
                  (loginMutation.error as any)?.response?.data?.error ||
                  (registerMutation.error as any)?.response?.data?.error ||
                  'Invalid email or password'}
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
      <PublicBottomNav />
    </div>
  );
};
