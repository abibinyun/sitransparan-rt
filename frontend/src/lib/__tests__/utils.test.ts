import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('Tailwind Classnames Merger (cn)', () => {
  it('menggabungkan kelas CSS sederhana', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
  });

  it('menyelesaikan konflik kelas Tailwind (tailwind-merge)', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
  });

  it('mengabaikan nilai falsy, null, atau undefined', () => {
    expect(cn('btn', false && 'hidden', null, undefined, 'btn-primary')).toBe('btn btn-primary');
  });
});
