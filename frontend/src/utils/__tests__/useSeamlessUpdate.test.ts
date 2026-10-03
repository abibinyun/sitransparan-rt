import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import { useSeamlessUpdate } from '../useSeamlessUpdate';

describe('useSeamlessUpdate Hook', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { reload: vi.fn(), pathname: '/' },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
  });

  it('tidak melempar error saat dijalankan di lingkungan tanpa service worker controller', () => {
    expect(() =>
      renderHook(() => useSeamlessUpdate(), {
        wrapper: ({ children }: { children: React.ReactNode }) =>
          React.createElement(MemoryRouter, null, children),
      })
    ).not.toThrow();
  });
});
