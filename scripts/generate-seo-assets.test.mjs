import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDynamicPages, buildHeadTags, buildSitemap, escapeXml, isPublicSlug } from './generate-seo-assets.mjs';

test('sitemap creates absolute escaped locations and lastmod values', () => {
  const sitemap = buildSitemap([{ path: '/current-affairs/a-b', lastmod: '2026-09-30T00:00:00Z' }], 'https://prep.example');
  assert.match(sitemap, /https:\/\/prep\.example\/current-affairs\/a-b/);
  assert.match(sitemap, /2026-09-30T00:00:00Z/);
  assert.match(escapeXml('A & B'), /A &amp; B/);
});

test('head tags escape content, canonicalize, and noindex protected pages', () => {
  const tags = buildHeadTags({ path: '/billing', title: 'Billing <Private>', description: 'Account & payments', indexable: false }, 'https://prep.example');
  assert.match(tags, /noindex,follow/);
  assert.match(tags, /https:\/\/prep\.example\/billing/);
  assert.match(tags, /Billing &lt;Private&gt;/);
  assert.match(tags, /Account &amp; payments/);
});

test('public slugs are URL-safe and reject nested paths', () => {
  assert.equal(isPublicSlug('issb-preparation'), true);
  assert.equal(isPublicSlug('bad/slug'), false);
  assert.equal(isPublicSlug('../billing'), false);
});

test('dynamic pages exclude drafts and premium study materials', () => {
  const pages = buildDynamicPages({
    materials: [
      { slug: 'public-guide', title: 'Public Guide', is_published: true, is_premium: false },
      { slug: 'premium-guide', title: 'Premium Guide', is_published: true, is_premium: true },
      { slug: 'draft-guide', title: 'Draft Guide', is_published: false, is_premium: false },
    ],
    affairs: [
      { slug: 'published-affair', title: 'Published', is_published: true },
      { slug: 'draft-affair', title: 'Draft', is_published: false },
    ],
    modules: [{ slug: 'issb-module', title: 'ISSB Module', is_published: true }],
  });
  assert.deepEqual(pages.map((page) => page.path), [
    '/study-materials/public-guide',
    '/current-affairs/published-affair',
    '/issb/issb-module',
  ]);
});

test('homepage structured data targets the working search URL', () => {
  const tags = buildHeadTags({ path: '/', title: 'FaujPrep', description: 'Preparation', schema: 'website' }, 'https://prep.example');
  assert.match(tags, /SearchAction/);
  assert.match(tags, /https:\/\/prep\.example\/search\?q=\{search_term_string\}/);
});