import { describe, it, expect } from 'vitest';
import { prefetchRoute } from '../routePrefetch';

describe('Route Prefetch Utility', () => {
  it('tidak crash saat rute tidak dikenal dipanggil', () => {
    expect(() => prefetchRoute('/unknown-route')).not.toThrow();
  });

  it('memproses rute umum tanpa melempar exception', () => {
    expect(() => prefetchRoute('/kabar')).not.toThrow();
    expect(() => prefetchRoute('/admin/residents')).not.toThrow();
    expect(() => prefetchRoute('/admin/financial')).not.toThrow();
  });
});
