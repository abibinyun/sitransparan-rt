import { create } from 'zustand';
import type { AuthState, Tenant, User } from '../types/auth';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const TENANT_KEY = 'active_tenant';

const getInitialToken = (): string | null => localStorage.getItem(TOKEN_KEY);
const getInitialUser = (): User | null => {
  const data = localStorage.getItem(USER_KEY);
  return data ? JSON.parse(data) : null;
};
const getInitialTenant = (): Tenant | null => {
  const data = localStorage.getItem(TENANT_KEY);
  return data ? JSON.parse(data) : null;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: getInitialToken(),
  user: getInitialUser(),
  activeTenant: getInitialTenant(),

  setAuth: (token: string, user: User, activeTenant: Tenant | null = null) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    const selectedTenant = activeTenant || (user.tenants && user.tenants.length > 0 ? user.tenants[0] : null);
    if (selectedTenant) {
      localStorage.setItem(TENANT_KEY, JSON.stringify(selectedTenant));
    } else {
      localStorage.removeItem(TENANT_KEY);
    }
    set({ token, user, activeTenant: selectedTenant });
  },

  setActiveTenant: (activeTenant: Tenant | null) => {
    if (activeTenant) {
      localStorage.setItem(TENANT_KEY, JSON.stringify(activeTenant));
    } else {
      localStorage.removeItem(TENANT_KEY);
    }
    set({ activeTenant });
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TENANT_KEY);
    set({ token: null, user: null, activeTenant: null });
  },
}));
