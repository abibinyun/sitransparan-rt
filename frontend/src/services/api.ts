import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { queryClient } from '../lib/queryClient';

const DEFAULT_API_BASE_URL = '/api/v1';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || DEFAULT_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const { token } = useAuthStore.getState();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // NOTE: the active tenant is deliberately NOT sent as an X-Tenant-ID header.
  // The backend derives the tenant exclusively from the signed JWT, so client
  // tenant hints cannot be used to escalate to another tenant. Tenant switching
  // is done server-side via POST /auth/switch-tenant, which re-issues a token
  // scoped to a tenant the user is actually mapped to.
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const isAuthRoute =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/register') ||
      originalRequest?.url?.includes('/auth/refresh') ||
      originalRequest?.url?.includes('/auth/logout') ||
      originalRequest?.url?.includes('/house-access/claim') ||
      originalRequest?.url?.includes('/house-access/me') ||
      originalRequest?.url?.includes('/push/subscribe') ||
      originalRequest?.url?.includes('/push/config') ||
      originalRequest?.url?.includes('/social/badge');

    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const isPublicPage =
      currentPath === '/' ||
      currentPath.startsWith('/kabar') ||
      currentPath.startsWith('/usulan') ||
      currentPath.startsWith('/agenda') ||
      currentPath.startsWith('/program') ||
      currentPath.startsWith('/claim') ||
      currentPath.startsWith('/t/claim');

    // Jika 401 dan bukan rute auth/public serta belum di-retry
    if (error.response?.status === 401 && !isAuthRoute && !originalRequest._retry) {
      const { refreshToken, setTokens, logout } = useAuthStore.getState();

      if (!refreshToken) {
        if (!isPublicPage) {
          logout();
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post<{ token: string; refresh_token?: string }>(
          `${import.meta.env.VITE_API_URL || DEFAULT_API_BASE_URL}/auth/refresh`,
          { refresh_token: refreshToken }
        );

        const newAccessToken = res.data.token;
        const newRefreshToken = res.data.refresh_token;

        setTokens(newAccessToken, newRefreshToken);
        processQueue(null, newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        logout();
        if (!isPublicPage && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 403 && String(error.response?.data?.error || '').includes('tenant')) {
      queryClient.clear();
    }
    return Promise.reject(error);
  }
);
