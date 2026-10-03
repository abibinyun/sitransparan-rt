import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../useAuthStore';
import type { User, Tenant } from '../../types/auth';

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().logout();
  });

  it('menyimpan token, user, tenant, dan refresh_token saat setAuth dipanggil', () => {
    const mockUser: User = {
      id: 'user-123',
      name: 'Warga Satu',
      email: 'warga1@test.local',
      role: 'resident',
      tenants: [],
    };
    const mockTenant: Tenant = {
      id: 'tenant-001',
      name: 'RT 01',
      slug: 'rt-001',
    };

    useAuthStore.getState().setAuth('mock-access-token', mockUser, mockTenant, 'mock-refresh-token');

    const state = useAuthStore.getState();
    expect(state.token).toBe('mock-access-token');
    expect(state.refreshToken).toBe('mock-refresh-token');
    expect(state.user?.name).toBe('Warga Satu');
    expect(state.activeTenant?.slug).toBe('rt-001');

    // Pastikan localStorage menyimpan key dengan prefix
    const keys = Object.keys(localStorage);
    const tokenKey = keys.find((k) => k.includes('auth_token'));
    const refreshKey = keys.find((k) => k.includes('refresh_token'));
    expect(tokenKey).toBeDefined();
    expect(refreshKey).toBeDefined();
  });

  it('memperbarui token saat setTokens dipanggil (rotasi token)', () => {
    useAuthStore.getState().setTokens('new-access-token', 'new-refresh-token');

    const state = useAuthStore.getState();
    expect(state.token).toBe('new-access-token');
    expect(state.refreshToken).toBe('new-refresh-token');
  });

  it('membersihkan seluruh state dan storage saat logout dipanggil', () => {
    const mockUser: User = {
      id: 'user-123',
      name: 'Warga Satu',
      email: 'warga1@test.local',
      role: 'resident',
      tenants: [],
    };
    useAuthStore.getState().setAuth('mock-access-token', mockUser, null, 'mock-refresh-token');

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.user).toBeNull();
    expect(state.activeTenant).toBeNull();
  });
});
