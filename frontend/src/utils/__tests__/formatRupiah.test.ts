import { describe, it, expect } from 'vitest';
import { formatRupiah } from '../../services/public_transparency';

describe('Financial Formatters (formatRupiah)', () => {
  it('memformat angka positif menjadi format Rupiah Indonesia', () => {
    const formatted = formatRupiah(50000);
    expect(formatted).toMatch(/Rp\s?50\.000/);
  });

  it('memformat angka 0 dengan benar', () => {
    const formatted = formatRupiah(0);
    expect(formatted).toMatch(/Rp\s?0/);
  });

  it('memformat nominal besar jutaan dengan separator titik', () => {
    const formatted = formatRupiah(15750000);
    expect(formatted).toMatch(/Rp\s?15\.750\.000/);
  });
});
