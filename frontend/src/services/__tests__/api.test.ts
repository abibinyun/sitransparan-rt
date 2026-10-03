import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { api } from '../api';
import { useAuthStore } from '../../store/useAuthStore';

describe('API Service & Axios Interceptors', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().logout();
    vi.restoreAllMocks();
  });

  it('menginjeksi Bearer token ke Authorization header saat token ada', async () => {
    useAuthStore.getState().setAuth('test-jwt-token', {
      id: 'user-1',
      name: 'User 1',
      email: 'user1@test.local',
      role: 'resident',
      tenants: [],
    });

    let capturedHeaders: any;
    api.defaults.adapter = async (config) => {
      capturedHeaders = config.headers;
      return {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };

    await api.get('/residents');

    expect(capturedHeaders.Authorization).toBe('Bearer test-jwt-token');
  });

  it('melakukan silent refresh token saat response 401 dan mengulang request', async () => {
    useAuthStore.getState().setAuth(
      'expired-jwt-token',
      {
        id: 'user-1',
        name: 'User 1',
        email: 'user1@test.local',
        role: 'resident',
        tenants: [],
      },
      null,
      'valid-refresh-token'
    );

    // Mock axios.post khusus untuk refresh endpoint
    vi.spyOn(axios, 'post').mockResolvedValue({
      data: {
        token: 'new-refreshed-jwt-token',
        refresh_token: 'new-rotated-refresh-token',
      },
    });

    let callCount = 0;
    api.defaults.adapter = async (config) => {
      callCount++;
      if (callCount === 1) {
        const error: any = new Error('Request failed with status code 401');
        error.response = {
          status: 401,
          data: { error: 'token expired' },
          statusText: 'Unauthorized',
          headers: {},
          config,
        };
        error.config = config;
        throw error;
      }
      return {
        data: { data: ['resident1', 'resident2'] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };

    const res = await api.get('/residents');
    expect(res.data.data).toEqual(['resident1', 'resident2']);

    // Pastikan useAuthStore telah diperbarui dengan token hasil rotasi
    expect(useAuthStore.getState().token).toBe('new-refreshed-jwt-token');
    expect(useAuthStore.getState().refreshToken).toBe('new-rotated-refresh-token');
  });
});
