import { describe, it, expect } from 'vitest';
import { adminDocCategories, getAllArticles, getArticleBySlug } from './adminDocsData';

describe('Admin Docs Data Structure', () => {
  it('contains at least 6 core categories', () => {
    expect(adminDocCategories.length).toBeGreaterThanOrEqual(6);
  });

  it('each category has valid articles with unique slugs', () => {
    const articles = getAllArticles();
    expect(articles.length).toBeGreaterThanOrEqual(6);
    const slugs = articles.map((a) => a.slug);
    const uniqueSlugs = new Set(slugs);
    expect(uniqueSlugs.size).toBe(slugs.length);
  });

  it('getArticleBySlug retrieves exact article and returns undefined for invalid slug', () => {
    const firstSlug = adminDocCategories[0].articles[0].slug;
    const found = getArticleBySlug(firstSlug);
    expect(found).toBeDefined();
    expect(found?.slug).toBe(firstSlug);

    const notFound = getArticleBySlug('non-existent-slug-xyz');
    expect(notFound).toBeUndefined();
  });

  it('accurately describes QR code purpose as citizen claim, not waste scanner', () => {
    const qrArticle = getArticleBySlug('stiker-qr-dan-reset-pin-rumah');
    expect(qrArticle).toBeDefined();
    const allContent = qrArticle!.sections.flatMap((s) => s.content).join(' ');
    // Harus menjelaskan klaim akun warga dan tidak mengklaim petugas sampah memindai QR
    expect(allContent).toContain('klaim akses rumah');
    expect(allContent).not.toContain('Petugas sampah memindai stiker');
  });

  it('accurately documents flexible resident and house creation workflows with auto account generation', () => {
    const residentArticle = getArticleBySlug('manajemen-warga-dan-kk');
    expect(residentArticle).toBeDefined();
    const allContent = residentArticle!.sections.flatMap((s) => [
      ...s.content,
      s.callout?.message || '',
      ...(s.steps?.map((st) => `${st.title} ${st.description}`) || []),
    ]).join(' ');
    // Harus menyebutkan pembuatan rumah inline dan akun portal otomatis
    expect(allContent).toContain('akun');
    expect(allContent).toContain('Rumah Baru');
  });
});
