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
});
