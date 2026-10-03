import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getTenantSlugFromHost, getPlatformUrl } from '../tenant';

describe('Tenant & Routing Utilities', () => {
  const originalLocation = window.location;

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
  });

  it('mengekstrak tenant slug dari hostname subdomain', () => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { hostname: 'rt-003.iscube.web.id' },
    });
    const slug = getTenantSlugFromHost();
    expect(slug).toBe('rt-003');
  });

  it('mengembalikan null jika host adalah root platform domain', () => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { hostname: 'iscube.web.id' },
    });
    const slug = getTenantSlugFromHost();
    expect(slug).toBeNull();
  });

  it('mengembalikan null untuk hostname localhost biasa tanpa subdomain', () => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { hostname: 'localhost' },
    });
    const slug = getTenantSlugFromHost();
    expect(slug).toBeNull();
  });

  it('getPlatformUrl membangun path dengan benar', () => {
    const url = getPlatformUrl('/login');
    expect(url).toContain('/login');
  });
});
