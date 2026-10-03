import { describe, it, expect } from 'vitest';
import { compressImage } from '../imageCompressor';

describe('Image Compressor Utility', () => {
  it('melewati berkas non-gambar tanpa kompresi', async () => {
    const file = new File(['dummy content'], 'document.pdf', { type: 'application/pdf' });
    const result = await compressImage(file);
    expect(result).toBe(file);
  });

  it('melewati berkas gambar vektor SVG tanpa kompresi', async () => {
    const svgFile = new File(['<svg></svg>'], 'icon.svg', { type: 'image/svg+xml' });
    const result = await compressImage(svgFile);
    expect(result).toBe(svgFile);
  });
});
