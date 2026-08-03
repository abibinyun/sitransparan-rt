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
  const { token, activeTenant } = useAuthStore.getState();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (activeTenant?.id) {
    config.headers['X-Tenant-ID'] = activeTenant.id;
  }
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
