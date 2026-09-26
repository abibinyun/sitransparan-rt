import { create } from 'zustand';
import type { AuthState, Tenant, User } from '../types/auth';
import { queryClient } from '../lib/queryClient';
import { getTenantBaseDomain } from '../utils/tenant';

// Derive environment key prefix so dev, staging, and production sessions/cookies are completely isolated
const isDevEnv = typeof window !== 'undefined' && (
  window.location.hostname.includes('dev') ||
  window.location.hostname.includes('-dev')
);
const isStagingEnv = typeof window !== 'undefined' && (
  window.location.hostname.includes('staging') ||
  window.location.hostname.includes('-staging')
);
const ENV_PREFIX = isDevEnv ? 'dev_' : isStagingEnv ? 'staging_' : '';

const TOKEN_KEY = `${ENV_PREFIX}auth_token`;
const USER_KEY = `${ENV_PREFIX}auth_user`;
const TENANT_KEY = `${ENV_PREFIX}active_tenant`;

const getCookie = (name: string): string | null => {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
};
const setCookie = (name: string, value: string, days = 1) => {
  try {
    const domain = getTenantBaseDomain();
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const domainPart = isLocalhost ? '' : `; Domain=.${domain}`;
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${days*86400}${domainPart}${secure}; SameSite=Lax`;
  } catch {}
};
const deleteCookie = (name: string) => {
  try {
    const domain = getTenantBaseDomain();
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const domainPart = isLocalhost ? '' : `; Domain=.${domain}`;
    // Hapus dengan domain spesifik (jika diset dengan domain)
    document.cookie = `${name}=; Path=/; Max-Age=0${domainPart}; SameSite=Lax`;
    // Hapus juga tanpa domain (host-only cookie)
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
  } catch {}
};

// Ask the service worker to delete runtime caches (api-cache, pages-cache) so
// private API responses of a previous session are never served to a different
// session on the same origin (e.g. after logout or tenant/user switch).
const broadcastLogout = () => { try { const bc = new BroadcastChannel('auth'); bc.postMessage({ type: 'LOGOUT' }); bc.close(); } catch {} };
const clearServiceWorkerCaches = () => {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  const notify = (sw: ServiceWorker | null | undefined) => sw?.postMessage({ type: 'CLEAR_CACHES' });
  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) => {
      registrations.forEach((reg) => {
        // Message every live worker (active, waiting, installing) so the cache
        // is cleared even right after an auto-update swapped in a new worker.
        notify(reg.active);
        notify(reg.waiting);
        notify(reg.installing);
      });
    })
    .catch(() => {});
};

const parseJwt = (token: string): any => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

const getInitialToken = (): string | null => {
  const urlToken = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('token') : null;
  if (urlToken) {
    try {
      localStorage.setItem(TOKEN_KEY, urlToken);
      setCookie(TOKEN_KEY, urlToken);
    } catch {}
    return urlToken;
  }
  const ck = getCookie(TOKEN_KEY);
  const ls = localStorage.getItem(TOKEN_KEY);
  if (ck && ck !== ls) {
    try { localStorage.setItem(TOKEN_KEY, ck); } catch {}
    return ck;
  }
  if (ls) return ls;
  if (ck) return ck;
  return null;
};
const getInitialUser = (): User | null => {
  const urlToken = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('token') : null;
  if (urlToken) {
    const payload = parseJwt(urlToken);
    if (payload && payload.user_id) {
      const u: User = {
        id: payload.user_id,
        email: payload.email || 'admin@sitransparan.rt',
        name: payload.name || (payload.role === 'superadmin' ? 'Super Admin' : 'Admin'),
        role: payload.role || 'resident',
        tenants: [],
      };
      try {
        localStorage.setItem(USER_KEY, JSON.stringify(u));
        setCookie(USER_KEY, JSON.stringify(u));
      } catch {}
      return u;
    }
  }
  const ck = getCookie(USER_KEY);
  const ls = localStorage.getItem(USER_KEY);
  if (ck) {
    try {
      const uCk = JSON.parse(decodeURIComponent(ck));
      if (ls) {
        try {
          const uLs = JSON.parse(ls);
          if (uCk.email !== uLs.email || uCk.id !== uLs.id) {
            localStorage.setItem(USER_KEY, JSON.stringify(uCk));
            return uCk;
          }
        } catch {}
      } else {
        localStorage.setItem(USER_KEY, JSON.stringify(uCk));
        return uCk;
      }
      // cookie and ls same user -> use cookie (fresh)
      return uCk;
    } catch {}
  }
  if (ls) try { return JSON.parse(ls); } catch {}
  return null;
};
const getInitialTenant = (): Tenant | null => {
  const ck = getCookie(TENANT_KEY);
  const ls = localStorage.getItem(TENANT_KEY);
  if (ck) {
    try {
      const tCk = JSON.parse(decodeURIComponent(ck));
      if (ls) {
        try {
          const tLs = JSON.parse(ls);
          if (tCk.id !== tLs.id || tCk.slug !== tLs.slug) {
            localStorage.setItem(TENANT_KEY, JSON.stringify(tCk));
            return tCk;
          }
        } catch {}
      } else {
        localStorage.setItem(TENANT_KEY, JSON.stringify(tCk));
        return tCk;
      }
      return tCk;
    } catch {}
  }
  if (ls) try { return JSON.parse(ls); } catch {}
  return null;
};

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try { const bc = new BroadcastChannel('auth'); bc.onmessage = (e) => { if (e.data?.type === 'LOGOUT') { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); localStorage.removeItem(TENANT_KEY); queryClient.clear(); } }; } catch {} }

export const useAuthStore = create<AuthState>((set) => ({
  token: getInitialToken(),
  user: getInitialUser(),
  activeTenant: getInitialTenant(),

  setAuth: (token: string, user: User, activeTenant: Tenant | null = null) => {
    queryClient.clear();
    clearServiceWorkerCaches();
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setCookie(TOKEN_KEY, token);
    setCookie(USER_KEY, JSON.stringify(user));
    const selectedTenant = activeTenant || (user.tenants && user.tenants.length > 0 ? user.tenants[0] : null);
    if (selectedTenant) {
      localStorage.setItem(TENANT_KEY, JSON.stringify(selectedTenant));
      setCookie(TENANT_KEY, JSON.stringify(selectedTenant));
    } else {
      localStorage.removeItem(TENANT_KEY);
      deleteCookie(TENANT_KEY);
    }
    set({ token, user, activeTenant: selectedTenant });
  },

  setActiveTenant: (activeTenant: Tenant | null) => {
    queryClient.clear();
    clearServiceWorkerCaches();
    if (activeTenant) {
      localStorage.setItem(TENANT_KEY, JSON.stringify(activeTenant));
      setCookie(TENANT_KEY, JSON.stringify(activeTenant));
    } else {
      localStorage.removeItem(TENANT_KEY);
      deleteCookie(TENANT_KEY);
    }
    set({ activeTenant });
  },

  updateUser: (partialUser: Partial<User>) => {
    set((state) => {
      if (!state.user) return state;
      const updated = { ...state.user, ...partialUser };
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      setCookie(USER_KEY, JSON.stringify(updated));
      return { user: updated };
    });
  },

  logout: () => {
    queryClient.clear();
    clearServiceWorkerCaches();
    broadcastLogout();
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TENANT_KEY);
    deleteCookie(TOKEN_KEY);
    deleteCookie(USER_KEY);
    deleteCookie(TENANT_KEY);
    // Clean token from URL if present
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('token');
      window.history.replaceState({}, '', url.toString());
    } catch {}
    set({ token: null, user: null, activeTenant: null });
  },
}));
