import { describe, it, expect } from 'vitest';
import { generateWhatsAppOrderUrl } from '../whatsapp';

describe('WhatsApp Order URL Generator', () => {
  it('menghasilkan URL WhatsApp dengan nomor yang dinormalisasi dan pesan ter-encode', () => {
    const url = generateWhatsAppOrderUrl({
      phone: '0812-3456-7890',
      buyerName: 'Budi',
      buyerHouse: 'Blok B-04',
      productTitle: 'Nasi Uduk Komplit',
      price: 15000,
    });

    expect(url).toContain('https://wa.me/6281234567890');
    expect(url).toContain(encodeURIComponent('Nasi Uduk Komplit'));
    expect(url).toContain(encodeURIComponent('Budi'));
    expect(url).toContain(encodeURIComponent('Blok B-04'));
  });

  it('mengembalikan string kosong jika nomor telepon tidak valid', () => {
    const url = generateWhatsAppOrderUrl({
      phone: '',
      buyerName: 'Budi',
      buyerHouse: 'Blok B-04',
      productTitle: 'Nasi Uduk',
    });
    expect(url).toBe('');
  });
});
