import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = join(projectRoot, 'dist');
const staticPages = [
  { path: '/', title: 'FaujPrep — Pakistan Military Test Preparation', description: 'Prepare for Pakistan Army, PAF, Navy and ISSB tests with independent practice questions, mock tests, study materials and current affairs on FaujPrep.', schema: 'website' },
  { path: '/army', title: 'Pakistan Army Test Preparation | FaujPrep', description: 'Independent Pakistan Army entry-test preparation resources, practice questions and study materials from FaujPrep.', breadcrumb: ['Home', 'Pakistan Army'] },
  { path: '/paf', title: 'Pakistan Air Force Test Preparation | FaujPrep', description: 'Independent Pakistan Air Force entry-test preparation resources, practice questions and study materials from FaujPrep.', breadcrumb: ['Home', 'Pakistan Air Force'] },
  { path: '/navy', title: 'Pakistan Navy Test Preparation | FaujPrep', description: 'Independent Pakistan Navy entry-test preparation resources, practice questions and study materials from FaujPrep.', breadcrumb: ['Home', 'Pakistan Navy'] },
  { path: '/issb', title: 'ISSB Preparation | FaujPrep', description: 'Explore independent ISSB preparation resources, public modules, practice and guidance on FaujPrep.', breadcrumb: ['Home', 'ISSB'] },
  { path: '/study-materials', title: 'Study Materials | FaujPrep', description: 'Browse published preparation notes, guides and study materials for Pakistan Army, PAF, Navy and ISSB tests.' },
  { path: '/current-affairs', title: 'Current Affairs | FaujPrep', description: 'Read published current-affairs summaries and coverage for general awareness and military test preparation.' },
  { path: '/mock-tests', title: 'Mock Tests | FaujPrep', description: 'Explore available mock tests for independent Pakistan Army, PAF, Navy and ISSB preparation.' },
  { path: '/practice', title: 'Practice Questions | FaujPrep', description: 'Practice questions across subjects for Pakistan military entry tests with FaujPrep.' },
  { path: '/resources', title: 'Preparation Resources | FaujPrep', description: 'Browse public preparation resources, study materials and current affairs from FaujPrep.' },
  { path: '/pricing', title: 'Plans and Pricing | FaujPrep', description: 'Compare the free and paid preparation plans available on FaujPrep.' },
  { path: '/about', title: 'About FaujPrep | Independent Test Preparation', description: "Explore FaujPrep's independent Pakistan military entry-test preparation resources, timed practice, mock tests and study guidance.", schema: 'organization' },
  { path: '/contact', title: 'Contact FaujPrep', description: 'Get support from FaujPrep about independent preparation resources, account access, or payment questions.', schema: 'contact' },
  { path: '/privacy', title: 'Privacy Policy | FaujPrep', description: 'Read what information FaujPrep processes, how Supabase, Vercel Analytics and Google advertising may be used, and how to contact us.' },
  { path: '/terms', title: 'Terms of Service | FaujPrep', description: 'Review the terms for using FaujPrep preparation resources, accounts, and paid mock tests.' },
  { path: '/disclaimer', title: 'Independent Preparation Disclaimer | FaujPrep', description: 'FaujPrep is an independent educational preparation platform and is not an official military or government website.' },
];

export function escapeXml(value) {
  return String(value).replace(/[<>&'\"]/g, (character) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;',
  })[character]);
}

export function isPublicSlug(value) {
  return typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(value);
}

export function buildSitemap(entries, siteUrl) {
  if (!siteUrl) return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>\n';
  const urls = entries.map((entry) => {
    const loc = new URL(entry.path, `${siteUrl.replace(/\/+$/, '')}/`).href;
    const lastmod = entry.lastmod ? `<lastmod>${escapeXml(entry.lastmod)}</lastmod>` : '';
    return `<url><loc>${escapeXml(loc)}</loc>${lastmod}</url>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>\n`;
}

function safeDescription(value, fallback) {
  const text = String(value || fallback).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > 160 ? `${text.slice(0, 157).trimEnd()}...` : text;
}

function jsonLdFor(page, siteUrl) {
  const nodes = [];
  if (page.schema === 'website') {
    const searchUrl = siteUrl ? `${new URL('/search', siteUrl).href}?q={search_term_string}` : null;
    nodes.push({
      '@type': 'WebSite',
      name: 'FaujPrep',
      ...(siteUrl ? { url: new URL('/', siteUrl).href } : {}),
      description: page.description,
      ...(searchUrl ? { potentialAction: { '@type': 'SearchAction', target: searchUrl, 'query-input': 'required name=search_term_string' } } : {}),
    });
  }
  if (page.schema === 'article') {
    nodes.push({
      '@type': 'Article',
      headline: page.title.replace(/ \| FaujPrep$/, ''),
      description: page.description,
      ...(page.publishedAt ? { datePublished: page.publishedAt } : {}),
      ...(page.updatedAt ? { dateModified: page.updatedAt } : {}),
      ...(page.image ? { image: page.image } : {}),
      publisher: { '@type': 'Organization', name: 'FaujPrep' },
    });
  }
  if (page.schema === 'organization') {
    nodes.push({
      '@type': 'Organization',
      name: 'FaujPrep',
      ...(siteUrl ? { url: new URL('/', siteUrl).href } : {}),
      email: 'miqdadhayder514@gmail.com',
      description: page.description,
    });
  }
  if (page.schema === 'contact') {
    nodes.push({
      '@type': 'ContactPage',
      name: page.title,
      description: page.description,
      mainEntity: {
        '@type': 'Organization',
        name: 'FaujPrep',
        email: 'miqdadhayder514@gmail.com',
      },
    });
  }
  if (page.breadcrumb?.length) {
    nodes.push({
      '@type': 'BreadcrumbList',
      itemListElement: page.breadcrumb.map((name, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name,
        ...(index === page.breadcrumb.length - 1 ? {} : { item: new URL(index === 0 ? '/' : page.path.split('/').slice(0, index + 1).join('/'), siteUrl || 'https://seo.invalid').href }),
      })),
    });
  }
  return nodes.length ? { '@context': 'https://schema.org', ...(nodes.length > 1 ? { '@graph': nodes } : nodes[0]) } : null;
}

export function buildHeadTags(page, siteUrl) {
  const canonical = siteUrl ? new URL(page.path, `${siteUrl.replace(/\/+$/, '')}/`).href : null;
  const image = page.image || (siteUrl ? new URL('/favicon.svg', siteUrl).href : null);
  const tags = [
    `<title>${escapeXml(page.title)}</title>`,
    `<meta name="description" content="${escapeXml(safeDescription(page.description, 'Independent preparation resources from FaujPrep.'))}" />`,
    `<meta name="robots" content="${page.indexable === false ? 'noindex,follow' : 'index,follow'}" />`,
    `<meta property="og:type" content="${page.schema === 'article' ? 'article' : 'website'}" />`,
    '<meta property="og:site_name" content="FaujPrep" />',
    `<meta property="og:title" content="${escapeXml(page.title)}" />`,
    `<meta property="og:description" content="${escapeXml(safeDescription(page.description, 'Independent preparation resources from FaujPrep.'))}" />`,
    ...(canonical ? [`<link rel="canonical" href="${escapeXml(canonical)}" />`, `<meta property="og:url" content="${escapeXml(canonical)}" />`] : []),
    ...(image ? [`<meta property="og:image" content="${escapeXml(image)}" />`] : []),
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${escapeXml(page.title)}" />`,
    `<meta name="twitter:description" content="${escapeXml(safeDescription(page.description, 'Independent preparation resources from FaujPrep.'))}" />`,
    ...(image ? [`<meta name="twitter:image" content="${escapeXml(image)}" />`] : []),
  ];
  const structuredData = jsonLdFor(page, siteUrl);
  if (structuredData) tags.push(`<script type="application/ld+json">${JSON.stringify(structuredData).replace(/</g, '\\u003c')}</script>`);
  return tags.join('\n    ');
}

function validSiteUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.origin : null;
  } catch {
    return null;
  }
}

async function fetchPublicRows(supabaseUrl, anonKey, table, select, filters = {}) {
  const allRows = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const url = new URL(`/rest/v1/${table}`, supabaseUrl);
    url.searchParams.set('select', select);
    url.searchParams.set('order', 'slug.asc');
    url.searchParams.set('limit', String(pageSize));
    for (const [key, value] of Object.entries(filters)) url.searchParams.set(key, value);
    const response = await fetch(url, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, Range: `${offset}-${offset + pageSize - 1}` },
    });
    if (!response.ok) throw new Error(`${table} public query failed (${response.status})`);
    const rows = await response.json();
    allRows.push(...rows);
    if (rows.length < pageSize) break;
  }
  return allRows;
}

export function buildDynamicPages({ materials = [], affairs = [], modules = [], mockTests = [] }) {
  return [
    ...materials.filter((item) => item.is_published && !item.is_premium && isPublicSlug(item.slug)).map((item) => ({
      path: `/study-materials/${encodeURIComponent(item.slug)}`,
      title: `${item.title} | FaujPrep`,
      description: [item.description || item.title, [item.material_type, item.subjects?.name, item.topics?.name, item.military_branches?.name].filter(Boolean).join(' / ')].filter(Boolean).join(' '),
      image: item.cover_image_url || null,
      lastmod: item.updated_at || null,
      updatedAt: item.updated_at || null,
      indexable: true,
      breadcrumb: ['Home', 'Study Materials', item.title],
      ...(item.material_type === 'ARTICLE' ? { schema: 'article' } : {}),
    })),
    ...affairs.filter((item) => item.is_published && isPublicSlug(item.slug)).map((item) => ({
      path: `/current-affairs/${encodeURIComponent(item.slug)}`,
      title: `${item.title} | FaujPrep`,
      description: item.category ? `${item.category}: ${item.summary || item.title}` : item.summary || item.title,
      image: item.image_url || null,
      lastmod: item.published_at || null,
      publishedAt: item.published_at || null,
      indexable: true,
      breadcrumb: ['Home', 'Current Affairs', item.title],
      schema: 'article',
    })),
    ...modules.filter((item) => item.is_published && isPublicSlug(item.slug)).map((item) => ({
      path: `/issb/${encodeURIComponent(item.slug)}`,
      title: `${item.title} | ISSB Preparation | FaujPrep`,
      description: item.module_type ? `${item.module_type}: ${item.description || item.title}` : item.description || item.title,
      indexable: true,
      breadcrumb: ['Home', 'ISSB', item.title],
    })),
    ...mockTests.filter((item) => item.is_active && !item.is_premium && isPublicSlug(item.slug)).map((item) => ({
      path: `/mock-tests/${encodeURIComponent(item.slug)}`,
      title: `${item.title} | Mock Test | FaujPrep`,
      description: [item.description || item.title, item.category].filter(Boolean).join(' '),
      lastmod: item.updated_at || null,
      indexable: true,
      breadcrumb: ['Home', 'Mock Tests', item.title],
    })),
  ];
}

async function getDynamicPages(env) {
  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) return [];
  const supabaseUrl = env.VITE_SUPABASE_URL.replace(/\/+$/, '');
  const anonKey = env.VITE_SUPABASE_ANON_KEY;
  const queries = await Promise.allSettled([
    fetchPublicRows(supabaseUrl, anonKey, 'study_materials', 'slug,title,description,material_type,updated_at,cover_image_url,is_published,is_premium,subjects(name),topics(name),military_branches(name)', { is_published: 'eq.true', is_premium: 'eq.false' }),
    fetchPublicRows(supabaseUrl, anonKey, 'current_affairs', 'slug,title,summary,category,published_at,image_url,is_published', { is_published: 'eq.true' }),
    fetchPublicRows(supabaseUrl, anonKey, 'issb_modules', 'slug,title,description,module_type,is_published', { is_published: 'eq.true' }),
    fetchPublicRows(supabaseUrl, anonKey, 'mock_tests', 'slug,title,description,category,updated_at,is_active,is_premium', { is_active: 'eq.true', is_premium: 'eq.false' }),
  ]);
  const [materialsResult, affairsResult, modulesResult, mockTestsResult] = queries;
  for (const result of queries) {
    if (result.status === 'rejected') console.warn(`SEO public content fetch skipped: ${result.reason.message}`);
  }
  const materials = materialsResult.status === 'fulfilled' ? materialsResult.value : [];
  const affairs = affairsResult.status === 'fulfilled' ? affairsResult.value : [];
  const modules = modulesResult.status === 'fulfilled' ? modulesResult.value : [];
  const mockTests = mockTestsResult.status === 'fulfilled' ? mockTestsResult.value : [];
  return buildDynamicPages({ materials, affairs, modules, mockTests });
}

async function writePageShell(baseHtml, page, siteUrl) {
  const destination = join(outputRoot, page.path === '/' ? 'index.html' : `${page.path.replace(/^\/+|\/+$/g, '')}/index.html`);
  await mkdir(dirname(destination), { recursive: true });
  const headTags = buildHeadTags(page, siteUrl);
  const html = baseHtml
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta\s+name="description"[^>]*>/i, '')
    .replace('</head>', `    ${headTags}\n  </head>`);
  await writeFile(destination, html);
}

async function main() {
  const env = { ...loadEnv('production', projectRoot, ''), ...process.env };
  const siteUrl = validSiteUrl(env.VITE_SITE_URL);
  if (env.VITE_SITE_URL && !siteUrl) throw new Error('VITE_SITE_URL must be an absolute HTTP or HTTPS origin.');
  if (!siteUrl) console.warn('VITE_SITE_URL is not configured; absolute canonical URLs and sitemap locations will be omitted.');

  const baseHtml = await readFile(join(outputRoot, 'index.html'), 'utf8');
  const dynamicPages = await getDynamicPages(env);
  const pages = [...staticPages, ...dynamicPages];
  for (const page of pages) await writePageShell(baseHtml, page, siteUrl);

  const sitemapEntries = pages.map(({ path, lastmod }) => ({ path, lastmod }));
  await writeFile(join(outputRoot, 'sitemap.xml'), buildSitemap(sitemapEntries, siteUrl));
  const disallowedPaths = ['/admin', '/account', '/billing', '/checkout', '/dashboard', '/login', '/profile', '/register'];
  const robots = [
    'User-agent: *',
    'Allow: /',
    ...disallowedPaths.map((path) => `Disallow: ${path}`),
    ...(siteUrl ? [`Sitemap: ${siteUrl}/sitemap.xml`] : []),
    '',
  ].join('\n');
  await writeFile(join(outputRoot, 'robots.txt'), robots);
  console.log(`Generated ${pages.length} public SEO route shells and ${siteUrl ? sitemapEntries.length : 0} sitemap locations.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}