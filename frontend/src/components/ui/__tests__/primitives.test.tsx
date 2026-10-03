import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Button } from '../button';
import { Input } from '../input';
import { Badge } from '../badge';

describe('UI Primitives (Button, Input, Badge)', () => {
  it('Button merender label dan merespons klik', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Simpan Data</Button>);

    const btn = screen.getByRole('button', { name: /simpan data/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('Input menerima nilai dan trigger onChange', () => {
    const handleChange = vi.fn();
    render(<Input placeholder="Masukkan nama" onChange={handleChange} />);

    const input = screen.getByPlaceholderText(/masukkan nama/i);
    fireEvent.change(input, { target: { value: 'Budi' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('Badge merender teks dengan benar', () => {
    render(<Badge variant="secondary">Terverifikasi</Badge>);
    expect(screen.getByText('Terverifikasi')).toBeInTheDocument();
  });
});
