import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoginMutation } from '../services/auth';
import { useAuthStore } from '../store/useAuthStore';
import type { Tenant } from '../types/auth';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [pendingAuth, setPendingAuth] = useState<{ token: string; user: any } | null>(null);

  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const loginMutation = useLoginMutation();

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
            const initialTenant = data.user.tenants?.[0] || null;
            setAuth(data.token, data.user, initialTenant);
            navigate(data.user.role === 'SUPER_ADMIN' ? '/superadmin/tenants' : '/');
          }
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
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-8 shadow-md">
        <h2 className="text-center text-2xl font-bold text-gray-900">
          {pendingAuth ? 'Select Active RT / Tenant' : 'Login to Platform RT'}
        </h2>

        {loginMutation.isError && (
          <div className="rounded bg-red-50 p-3 text-sm text-red-600">
            {loginMutation.error.message || 'Login failed'}
          </div>
        )}

        {!pendingAuth ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loginMutation.isPending ? 'Logging in...' : 'Login'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleTenantSelectSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Select RT Tenant</label>
              <select
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
                className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {availableTenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.code})
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="w-full rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Continue
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
