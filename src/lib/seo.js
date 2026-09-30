export const SITE_NAME = 'FaujPrep';

export const DEFAULT_META_DESCRIPTION = 'Prepare for Pakistan Army, PAF, Navy and ISSB tests with independent practice questions, mock tests, study materials and current affairs on FaujPrep.';

const PRIVATE_PAGES = new Set([
  'admin',
  'admin-analytics',
  'admin-notifications',
  'notifications',
  'billing',
  'checkout',
  'dashboard',
  'login',
  'register',
  'profile',
  'question-practice',
  'mock-detail',
  'mock-result',
  'not-found',
]);

function cleanDescription(value, fallback = DEFAULT_META_DESCRIPTION) {
  const cleaned = String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return fallback;
  return cleaned.length > 160 ? `${cleaned.slice(0, 157).trimEnd()}...` : cleaned;
}

function createBreadcrumbs(items, canonical) {
  if (!items?.length || !canonical) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(item.path ? { item: new URL(item.path, canonical).href } : {}),
    })),
  };
}

export function getPageSeo({
  currentPage,
  pathname,
  search,
  backendData,
  studyMaterial,
  currentAffair,
  issbModule,
}) {
  const branch = backendData?.branches?.find((item) => item.slug === ({ army: 'pak-army', paf: 'paf', navy: 'pak-navy' }[currentPage]));
  const isSearch = currentPage === 'search' || Boolean(search);
  let title = 'FaujPrep — Pakistan Military Test Preparation';
  let description = DEFAULT_META_DESCRIPTION;
  let indexable = !PRIVATE_PAGES.has(currentPage) && !isSearch;
  let socialImage = null;
  let structuredData = null;
  let type = 'website';
  let breadcrumbItems = null;

  if (currentPage === 'army' || currentPage === 'paf' || currentPage === 'navy') {
    const name = currentPage === 'army' ? 'Pakistan Army' : currentPage === 'paf' ? 'Pakistan Air Force' : 'Pakistan Navy';
    title = `${name} Test Preparation | FaujPrep`;
    description = branch?.short_description || branch?.description || `Independent ${name} test preparation resources, practice questions and study materials from FaujPrep.`;
    breadcrumbItems = [{ name: 'Home', path: '/' }, { name, path: pathname }];
  } else if (currentPage === 'issb') {
    title = 'ISSB Preparation | FaujPrep';
    description = 'Explore independent ISSB preparation resources, public modules, practice and guidance on FaujPrep.';
    breadcrumbItems = [{ name: 'Home', path: '/' }, { name: 'ISSB', path: '/issb' }];
  } else if (currentPage === 'study-materials') {
    title = 'Study Materials | FaujPrep';
    description = 'Browse published preparation notes, guides and study materials for Pakistan Army, PAF, Navy and ISSB tests.';
  } else if (currentPage === 'study-material-detail') {
    indexable = Boolean(studyMaterial && !studyMaterial.is_premium);
    if (studyMaterial) {
      if (studyMaterial.is_premium) {
        title = 'Premium Study Material | FaujPrep';
        description = 'This FaujPrep study resource is available to eligible subscribers.';
      } else {
        title = `${studyMaterial.title} | FaujPrep`;
        const context = [studyMaterial.material_type, studyMaterial.subjects?.name, studyMaterial.topics?.name, studyMaterial.military_branches?.name].filter(Boolean).join(' / ');
        description = cleanDescription([studyMaterial.description || studyMaterial.content, context].filter(Boolean).join(' '));
        socialImage = studyMaterial.cover_image_url || null;
        breadcrumbItems = [
          { name: 'Home', path: '/' },
          { name: 'Study Materials', path: '/study-materials' },
          { name: studyMaterial.title },
        ];
        if (studyMaterial.material_type === 'ARTICLE') {
          type = 'article';
          structuredData = {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: studyMaterial.title,
            description,
            ...(studyMaterial.updated_at ? { dateModified: studyMaterial.updated_at } : {}),
            ...(socialImage ? { image: socialImage } : {}),
          };
        }
      }
    }
  } else if (currentPage === 'current-affairs') {
    title = 'Current Affairs | FaujPrep';
    description = 'Read published current-affairs summaries and coverage for general awareness and military test preparation.';
  } else if (currentPage === 'current-affairs-detail') {
    indexable = Boolean(currentAffair);
    if (currentAffair) {
      title = `${currentAffair.title} | FaujPrep`;
      const summary = currentAffair.summary || currentAffair.content;
      description = cleanDescription(currentAffair.category ? `${currentAffair.category}: ${summary}` : summary);
      socialImage = currentAffair.image_url || null;
      breadcrumbItems = [
        { name: 'Home', path: '/' },
        { name: 'Current Affairs', path: '/current-affairs' },
        { name: currentAffair.title },
      ];
      type = 'article';
      structuredData = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: currentAffair.title,
        description,
        ...(currentAffair.published_at ? { datePublished: currentAffair.published_at } : {}),
        ...(socialImage ? { image: socialImage } : {}),
        publisher: { '@type': 'Organization', name: SITE_NAME },
      };
    }
  } else if (currentPage === 'issb-detail') {
    indexable = Boolean(issbModule);
    if (issbModule) {
      title = `${issbModule.title} | ISSB Preparation | FaujPrep`;
      const moduleDescription = issbModule.description || issbModule.content;
      description = cleanDescription(issbModule.module_type ? `${issbModule.module_type}: ${moduleDescription}` : moduleDescription);
      breadcrumbItems = [
        { name: 'Home', path: '/' },
        { name: 'ISSB', path: '/issb' },
        { name: issbModule.title },
      ];
    }
  } else if (currentPage === 'mock-tests') {
    title = 'Mock Tests | FaujPrep';
    description = 'Explore available mock tests for independent Pakistan Army, PAF, Navy and ISSB preparation.';
  } else if (currentPage === 'practice') {
    title = 'Practice Questions | FaujPrep';
    description = 'Practice questions across subjects for Pakistan military entry tests with FaujPrep.';
  } else if (currentPage === 'exam') {
    const exam = backendData?.exams?.find((item) => item.slug === selectedForceId);
    indexable = false;
    if (exam) {
      title = `${exam.name} | FaujPrep`;
      description = exam.description || exam.short_description || `Preparation information and tests for ${exam.name}.`;
    }
  } else if (currentPage === 'subject') {
    const subject = backendData?.subjects?.find((item) => item.slug === selectedForceId);
    indexable = false;
    if (subject) {
      title = `${subject.name} Practice | FaujPrep`;
      description = subject.description || `Practice topics and questions for ${subject.name}.`;
    }
  } else if (currentPage === 'resources') {
    title = 'Preparation Resources | FaujPrep';
    description = 'Browse public preparation resources, study materials and current affairs from FaujPrep.';
  } else if (currentPage === 'pricing') {
    title = 'Plans and Pricing | FaujPrep';
    description = 'Compare the free and paid preparation plans available on FaujPrep.';
  } else if (currentPage === 'about') {
    title = 'About FaujPrep | Independent Test Preparation';
    description = 'Learn about FaujPrep, an independent preparation platform for Pakistan military entry tests and ISSB.';
  } else if (currentPage === 'contact') {
    title = 'Contact FaujPrep';
    description = 'Contact the FaujPrep team with questions about the independent preparation platform.';
  } else if (currentPage === 'dashboard') {
    title = 'Dashboard | FaujPrep';
    description = 'Your private FaujPrep preparation dashboard.';
  } else if (currentPage === 'billing') {
    title = 'Billing | FaujPrep';
    description = 'Private billing and subscription details for your FaujPrep account.';
  } else if (currentPage === 'checkout') {
    title = 'Checkout | FaujPrep';
    description = 'Secure checkout for FaujPrep preparation plans.';
  } else if (currentPage === 'login') {
    title = 'Sign In | FaujPrep';
    description = 'Sign in to your private FaujPrep account.';
  } else if (currentPage === 'register') {
    title = 'Create Account | FaujPrep';
    description = 'Create a private FaujPrep account to track preparation progress.';
  } else if (currentPage === 'profile') {
    title = 'Account | FaujPrep';
    description = 'Private account settings for FaujPrep.';
  } else if (currentPage === 'admin') {
    title = 'Administration | FaujPrep';
    description = 'Private FaujPrep content administration.';
  } else if (currentPage === 'admin-analytics') {
    title = 'Platform Analytics | FaujPrep';
    description = 'Private aggregate usage analytics for FaujPrep administrators.';
  } else if (currentPage === 'admin-notifications') {
    title = 'Notification Management | FaujPrep';
    description = 'Private notification campaign management for FaujPrep administrators.';
  } else if (currentPage === 'notifications') {
    title = 'Notifications | FaujPrep';
    description = 'Private notifications and study reminder preferences for your FaujPrep account.';
  } else if (currentPage === 'question-practice' || currentPage === 'mock-detail' || currentPage === 'mock-result') {
    title = 'Practice Session | FaujPrep';
    description = 'Private practice session on FaujPrep.';
  } else if (currentPage === 'privacy') {
    title = 'Privacy Policy | FaujPrep';
    description = 'Read the FaujPrep privacy policy and learn how account and platform data is handled.';
  } else if (currentPage === 'terms') {
    title = 'Terms of Service | FaujPrep';
    description = 'Review the terms that apply to using the FaujPrep preparation platform.';
  } else if (currentPage === 'disclaimer') {
    title = 'Independent Preparation Disclaimer | FaujPrep';
    description = 'FaujPrep is an independent educational preparation platform and is not an official military or government website.';
  } else if (currentPage === 'not-found') {
    title = 'Page Not Found | FaujPrep';
    description = 'The requested FaujPrep page could not be found.';
  }

  if (currentPage === 'home') {
    const siteUrl = absoluteUrl('/');
    structuredData = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      ...(siteUrl ? { url: siteUrl } : {}),
      description: DEFAULT_META_DESCRIPTION,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${absoluteUrl('/search')}?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    };
  }

  const canonicalPath = pathname?.replace(/\/+$/, '') || '/';
  const canonical = absoluteUrl(canonicalPath);
  if (structuredData?.['@type'] === 'WebSite' && canonical) structuredData.url = canonical;
  const breadcrumbs = createBreadcrumbs(breadcrumbItems, canonical);
  const graph = [structuredData, breadcrumbs].filter(Boolean);

  return {
    title,
    description: cleanDescription(description),
    path: canonicalPath,
    indexable,
    image: socialImage,
    type,
    structuredData: graph.length > 1 ? { '@context': 'https://schema.org', '@graph': graph.map(({ '@context': _context, ...item }) => item) } : graph[0] || null,
  };
}

function upsertMeta(selector, attribute, key, content) {
  let element = document.head.querySelector(selector);
  if (!content) {
    element?.remove();
    return;
  }
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function absoluteUrl(path) {
  const configuredOrigin = import.meta.env.VITE_SITE_URL;
  const origin = configuredOrigin || window.location.origin;
  try {
    return new URL(path, `${origin.replace(/\/+$/, '')}/`).href;
  } catch {
    return null;
  }
}

export function applySeoMetadata(metadata) {
  const canonical = absoluteUrl(metadata.path || window.location.pathname);
  const robots = metadata.indexable ? 'index,follow' : 'noindex,follow';
  const image = metadata.image ? absoluteUrl(metadata.image) : absoluteUrl('/favicon.svg');
  document.title = metadata.title;
  upsertMeta('meta[name="description"]', 'name', 'description', metadata.description);
  upsertMeta('meta[name="robots"]', 'name', 'robots', robots);
  upsertMeta('meta[property="og:type"]', 'property', 'og:type', metadata.type || 'website');
  upsertMeta('meta[property="og:site_name"]', 'property', 'og:site_name', SITE_NAME);
  upsertMeta('meta[property="og:title"]', 'property', 'og:title', metadata.title);
  upsertMeta('meta[property="og:description"]', 'property', 'og:description', metadata.description);
  upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonical);
  upsertMeta('meta[property="og:image"]', 'property', 'og:image', image);
  upsertMeta('meta[name="twitter:card"]', 'name', 'twitter:card', image ? 'summary_large_image' : 'summary');
  upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', metadata.title);
  upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', metadata.description);
  upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', image);

  let canonicalLink = document.head.querySelector('link[rel="canonical"]');
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.rel = 'canonical';
    document.head.appendChild(canonicalLink);
  }
  if (canonical) canonicalLink.href = canonical;

  let structuredDataScript = document.getElementById('faujprep-structured-data');
  if (metadata.structuredData) {
    if (!structuredDataScript) {
      structuredDataScript = document.createElement('script');
      structuredDataScript.id = 'faujprep-structured-data';
      structuredDataScript.type = 'application/ld+json';
      document.head.appendChild(structuredDataScript);
    }
    structuredDataScript.textContent = JSON.stringify(metadata.structuredData).replace(/</g, '\\u003c');
  } else {
    structuredDataScript?.remove();
  }
}