import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const DEFAULT_API_BASE_URL = '/api/v1';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || DEFAULT_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const { token } = useAuthStore.getState();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // NOTE: the active tenant is deliberately NOT sent as an X-Tenant-ID header.
  // The backend derives the tenant exclusively from the signed JWT, so client
  // tenant hints cannot be used to escalate to another tenant. Tenant switching
  // is done server-side via POST /auth/switch-tenant, which re-issues a token
  // scoped to a tenant the user is actually mapped to.
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);
