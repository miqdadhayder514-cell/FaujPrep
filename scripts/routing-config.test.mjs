import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const config = JSON.parse(await readFile(fileURLToPath(new URL('../vercel.json', import.meta.url)), 'utf8'));

test('Vercel serves the SPA for every client-routed page without replacing prerendered SEO pages', () => {
  const rewrites = new Map(config.rewrites.map((rewrite) => [rewrite.source, rewrite.destination]));
  for (const route of [
    '/search',
    '/interview',
    '/interview/:path*',
    '/dashboard',
    '/billing',
    '/checkout',
    '/admin',
    '/admin/:path*',
    '/notifications',
    '/account',
    '/notes/:slug',
    '/mock-tests/:slug/payment',
    '/practice-tests/:slug/payment',
  ]) {
    assert.equal(rewrites.get(route), '/index.html', `${route} should load the SPA on a direct request`);
  }

  for (const prerenderedRoute of [
    '/',
    '/army',
    '/paf',
    '/navy',
    '/issb',
    '/study-materials',
    '/current-affairs',
    '/mock-tests',
    '/practice',
    '/resources',
    '/pricing',
    '/about',
    '/contact',
    '/privacy',
    '/terms',
    '/disclaimer',
  ]) {
    assert.equal(rewrites.has(prerenderedRoute), false, `${prerenderedRoute} should retain its generated HTML shell`);
  }
});
