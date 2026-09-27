import { describe, it, expect } from 'vitest';
import { ShareableAnnouncement, extractAllPhotos, calculateImageFitBox, CARD_SHEET } from './ShareCardModal';

describe('ShareableAnnouncement interface', () => {
  it('supports image_url cover photo and post id', () => {
    const item: ShareableAnnouncement = {
      id: 'ann-123',
      title: 'Pemberitahuan Kerja Bakti',
      content: 'Diharapkan seluruh warga hadir membawa cangkul.',
      created_at: '2026-09-27T08:00:00Z',
      image_url: 'http://localhost:9000/sitransparan-files/rt-003/announcements/cover.webp',
    };

    expect(item.image_url).toBeDefined();
    expect(item.image_url).toContain('cover.webp');
    expect(item.id).toBe('ann-123');
  });

  it('supports image_urls array for multi-photo slider selection', () => {
    const item: ShareableAnnouncement = {
      id: 'ann-456',
      title: 'Pemberitahuan Lomba 17 Agustus',
      content: 'Rangkaian lomba dan pentas seni RT.',
      created_at: '2026-08-17T08:00:00Z',
      image_urls: ['/img/photo1.webp', '/img/photo2.webp', '/img/photo3.webp'],
    };

    expect(item.image_urls).toHaveLength(3);
    expect(item.image_urls?.[1]).toBe('/img/photo2.webp');
  });

  it('CARD_SHEET exports precise bounding box of inner card sheet for clean export cropping', () => {
    expect(CARD_SHEET.x).toBe(60);
    expect(CARD_SHEET.y).toBe(96);
    expect(CARD_SHEET.width).toBe(1080 - 120);
    expect(CARD_SHEET.height).toBe(1350 - 192);
  });
});
