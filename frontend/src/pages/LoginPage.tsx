import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoginMutation, useRegisterMutation } from '../services/auth';
import { useAuthStore } from '../store/useAuthStore';
import type { Tenant } from '../types/auth';

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
            const initialTenant = data.user.tenants?.[0] || null;
            setAuth(data.token, data.user, initialTenant);
            navigate(data.user.role === 'SUPER_ADMIN' ? '/superadmin/tenants' : '/');
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
          setRegisterSuccess('Registration successful. You can now login with your new account.');
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
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-8 shadow-md">
        <h2 className="text-center text-2xl font-bold text-gray-900">
          {pendingAuth ? 'Select Active RT / Tenant' : mode === 'login' ? 'Login to Platform RT' : 'Register Account'}
        </h2>

        {!pendingAuth && (
          <div className="grid grid-cols-2 rounded-lg bg-gray-100 p-1 text-sm font-medium">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`rounded-md px-3 py-2 ${mode === 'login' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600'}`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`rounded-md px-3 py-2 ${mode === 'register' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600'}`}
            >
              Register
            </button>
          </div>
        )}

        {registerSuccess && (
          <div className="rounded bg-green-50 p-3 text-sm text-green-700">
            {registerSuccess}
          </div>
        )}

        {mode === 'login' && loginMutation.isError && (
          <div className="rounded bg-red-50 p-3 text-sm text-red-600">
            {loginMutation.error.message || 'Login failed'}
          </div>
        )}

        {mode === 'register' && registerMutation.isError && (
          <div className="rounded bg-red-50 p-3 text-sm text-red-600">
            {registerMutation.error.message || 'Registration failed'}
          </div>
        )}

        {!pendingAuth && mode === 'login' ? (
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
        ) : !pendingAuth && mode === 'register' ? (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
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
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone <span className="text-gray-400">(optional)</span></label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="w-full rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {registerMutation.isPending ? 'Registering...' : 'Register'}
            </button>
            <p className="text-center text-sm text-gray-600">
              Already have an account?{' '}
              <button type="button" onClick={() => switchMode('login')} className="font-medium text-indigo-600 hover:text-indigo-700">
                Login here
              </button>
            </p>
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
