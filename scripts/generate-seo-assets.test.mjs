import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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

test('sitemap includes only active public mock-test detail pages', () => {
  const pages = buildDynamicPages({
    mockTests: [
      { slug: 'army-practice-mock', title: 'Army Practice Mock', is_active: true, is_premium: false, updated_at: '2026-10-01T00:00:00Z' },
      { slug: 'premium-mock', title: 'Premium Mock', is_active: true, is_premium: true },
      { slug: 'inactive-mock', title: 'Inactive Mock', is_active: false, is_premium: false },
      { slug: 'invalid/mock', title: 'Invalid Slug', is_active: true, is_premium: false },
    ],
  });

  assert.deepEqual(pages.map((page) => page.path), ['/mock-tests/army-practice-mock']);
  assert.equal(pages[0].lastmod, '2026-10-01T00:00:00Z');
  assert.match(buildHeadTags(pages[0], 'https://prep.example'), /index,follow/);
});

test('mock-test SEO indexes active free tests but noindexes premium tests', async () => {
  const { getPageSeo } = await import('../src/lib/seo.js');
  const publicSeo = getPageSeo({
    currentPage: 'mock-detail',
    pathname: '/mock-tests/army-practice-mock',
    backendData: { branches: [], exams: [], subjects: [], mockTests: [] },
    mockTest: { slug: 'army-practice-mock', title: 'Army Practice Mock', is_active: true, is_premium: false },
  });
  const premiumSeo = getPageSeo({
    currentPage: 'mock-detail',
    pathname: '/mock-tests/premium-mock',
    backendData: { branches: [], exams: [], subjects: [], mockTests: [] },
    mockTest: { slug: 'premium-mock', title: 'Premium Mock', is_active: true, is_premium: true },
  });

  assert.equal(publicSeo.indexable, true);
  assert.equal(premiumSeo.indexable, false);
});

test('homepage structured data targets the working search URL', () => {
  const tags = buildHeadTags({ path: '/', title: 'FaujPrep', description: 'Preparation', schema: 'website' }, 'https://prep.example');
  assert.match(tags, /SearchAction/);
  assert.match(tags, /https:\/\/prep\.example\/search\?q=\{search_term_string\}/);
});

test('about, contact, and policy pages remain indexable with distinct metadata', async () => {
  const { getPageSeo } = await import('../src/lib/seo.js');
  for (const [currentPage, pathname, title] of [
    ['about', '/about', 'About FaujPrep'],
    ['contact', '/contact', 'Contact FaujPrep'],
    ['privacy', '/privacy', 'Privacy Policy'],
    ['terms', '/terms', 'Terms of Service'],
  ]) {
    const metadata = getPageSeo({ currentPage, pathname });
    assert.equal(metadata.indexable, true, `${pathname} should be indexable`);
    assert.match(metadata.title, new RegExp(title));
    assert.ok(metadata.description.length > 40);
  }
});

test('private purchase and admin sign-in pages are not indexed', async () => {
  const { getPageSeo } = await import('../src/lib/seo.js');
  for (const currentPage of ['mock-payment', 'admin-login']) {
    assert.equal(getPageSeo({ currentPage, pathname: `/${currentPage}` }).indexable, false);
  }
});

test('about and contact static pages include useful organization structured data', () => {
  const about = buildHeadTags({
    path: '/about',
    title: 'About FaujPrep',
    description: 'Independent preparation resources.',
    schema: 'organization',
  }, 'https://prep.example');
  const contact = buildHeadTags({
    path: '/contact',
    title: 'Contact FaujPrep',
    description: 'Contact support.',
    schema: 'contact',
  }, 'https://prep.example');

  assert.match(about, /"@type":"Organization"/);
  assert.match(contact, /"@type":"ContactPage"/);
  assert.match(contact, /miqdadhayder514@gmail\.com/);
});

test('public copy does not describe live features as future plans', async () => {
  const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(appSource, /Phase [12]|will be activated in a future release/);
  assert.match(appSource, /Are full timed mock tests available\?/);
  assert.match(appSource, /does not currently provide AI-powered advice/);
});