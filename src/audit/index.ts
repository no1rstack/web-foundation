export type AuditSeverity = 'error' | 'warning';

export interface AuditFinding {
  code: string;
  severity: AuditSeverity;
  message: string;
  path?: string;
}

export interface LighthouseAssertion {
  minScore?: number;
  maxNumericValue?: number;
}

export interface LighthousePreset {
  ci: {
    collect: {
      numberOfRuns: number;
      settings: {
        preset: 'desktop';
        onlyCategories: string[];
      };
    };
    assert: {
      assertions: Record<string, ['error' | 'warn', LighthouseAssertion]>;
    };
  };
}

export function createLighthousePreset(options: {
  numberOfRuns?: number;
  performanceScore?: number;
  accessibilityScore?: number;
  seoScore?: number;
} = {}): LighthousePreset {
  return {
    ci: {
      collect: {
        numberOfRuns: options.numberOfRuns ?? 3,
        settings: {
          preset: 'desktop',
          onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        },
      },
      assert: {
        assertions: {
          'categories:performance': ['warn', { minScore: options.performanceScore ?? 0.8 }],
          'categories:accessibility': ['error', { minScore: options.accessibilityScore ?? 0.95 }],
          'categories:best-practices': ['warn', { minScore: 0.9 }],
          'categories:seo': ['error', { minScore: options.seoScore ?? 0.95 }],
          'document-title': ['error', { minScore: 1 }],
          'meta-description': ['error', { minScore: 1 }],
          'http-status-code': ['error', { minScore: 1 }],
          'is-crawlable': ['error', { minScore: 1 }],
          'crawlable-anchors': ['error', { minScore: 1 }],
          'link-text': ['error', { minScore: 1 }],
          'image-alt': ['error', { minScore: 1 }],
          'robots-txt': ['error', { minScore: 1 }],
          canonical: ['error', { minScore: 1 }],
          hreflang: ['warn', { minScore: 1 }],
          'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
          'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
          'total-blocking-time': ['warn', { maxNumericValue: 200 }],
        },
      },
    },
  };
}

export interface LinkinatorPreset {
  recurse: boolean;
  skip: string[];
  retry: boolean;
  timeout: number;
  concurrency: number;
  serverRoot?: string;
  linksToSkip: string[];
}

export function createLinkinatorPreset(options: {
  serverRoot?: string;
  skip?: string[];
  timeout?: number;
  concurrency?: number;
} = {}): LinkinatorPreset {
  return {
    recurse: true,
    retry: true,
    timeout: options.timeout ?? 10_000,
    concurrency: options.concurrency ?? 20,
    serverRoot: options.serverRoot,
    skip: options.skip ?? [],
    linksToSkip: [
      '^mailto:',
      '^tel:',
      '^javascript:',
      '^data:',
      '^blob:',
    ],
  };
}

export const axeSeoPreset = {
  runOnly: {
    type: 'tag',
    values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'],
  },
  rules: {
    'document-title': { enabled: true },
    'html-has-lang': { enabled: true },
    'image-alt': { enabled: true },
    label: { enabled: true },
    'landmark-one-main': { enabled: true },
    'page-has-heading-one': { enabled: true },
    'region': { enabled: true },
  },
} as const;

export const htmlValidateSeoPreset = {
  extends: ['html-validate:recommended', 'html-validate:a11y'],
  rules: {
    'document-title': 'error',
    'heading-level': 'error',
    'input-missing-label': 'error',
    'meta-refresh': 'error',
    'no-dup-id': 'error',
    'no-inline-style': 'off',
    'prefer-native-element': 'warn',
    'require-sri': 'warn',
    'void-style': ['error', { style: 'omit' }],
  },
} as const;

export interface RenderedLink {
  href: string;
  text?: string;
  rel?: string;
}

export interface RenderedImage {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface RenderedPageSnapshot {
  url: string;
  status: number;
  title: string;
  metaDescription?: string;
  canonicalUrls: string[];
  robots?: string;
  h1: string[];
  lang?: string;
  openGraph?: {
    title?: string;
    description?: string;
    url?: string;
    image?: string;
  };
  twitter?: {
    card?: string;
    title?: string;
    description?: string;
    image?: string;
  };
  jsonLd: unknown[];
  links: RenderedLink[];
  images: RenderedImage[];
  consoleErrors?: string[];
  hydrationErrors?: string[];
}

function normalizedUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    url.hash = '';
    return url.toString();
  } catch {
    return undefined;
  }
}

export function auditRenderedPage(
  page: RenderedPageSnapshot,
  options: {
    requireSocialImage?: boolean;
    requireJsonLd?: boolean;
    allowNoindex?: boolean;
  } = {},
): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const add = (code: string, message: string, severity: AuditSeverity = 'error', path?: string) =>
    findings.push({ code, message, severity, path });

  if (page.status < 200 || page.status >= 400) {
    add('http-status', `Expected a successful or redirect response, received ${page.status}`);
  }
  if (!page.title.trim()) add('title-missing', 'The rendered page has no title');
  else if (page.title.length > 60) add('title-length', 'Title exceeds 60 characters', 'warning');
  if (!page.metaDescription?.trim()) add('description-missing', 'Meta description is missing');
  else if (page.metaDescription.length > 170) {
    add('description-length', 'Meta description exceeds 170 characters', 'warning');
  }
  if (page.canonicalUrls.length !== 1) {
    add('canonical-count', `Expected exactly one canonical URL, found ${page.canonicalUrls.length}`);
  } else {
    const canonical = normalizedUrl(page.canonicalUrls[0]);
    if (!canonical) add('canonical-invalid', 'Canonical URL must be absolute');
  }
  if (!options.allowNoindex && /\bnoindex\b/i.test(page.robots ?? '')) {
    add('unexpected-noindex', 'Public page is marked noindex');
  }
  if (page.h1.length !== 1) add('h1-count', `Expected exactly one H1, found ${page.h1.length}`);
  if (!page.lang) add('language-missing', 'The html element has no language');
  if (options.requireJsonLd !== false && page.jsonLd.length === 0) {
    add('jsonld-missing', 'No JSON-LD entities were found');
  }
  if (!page.openGraph?.title || !page.openGraph.description || !page.openGraph.url) {
    add('open-graph-incomplete', 'Open Graph title, description, and URL are required');
  }
  if (options.requireSocialImage && !page.openGraph?.image) {
    add('open-graph-image', 'Open Graph image is required');
  }
  if (!page.twitter?.card || !page.twitter.title || !page.twitter.description) {
    add('twitter-incomplete', 'Twitter Card metadata is incomplete');
  }

  page.images.forEach((image, index) => {
    if (!image.alt?.trim()) add('image-alt', 'Image is missing descriptive alt text', 'error', `images[${index}]`);
    if (!image.width || !image.height) {
      add('image-dimensions', 'Image is missing explicit width or height', 'warning', `images[${index}]`);
    }
  });
  page.links.forEach((link, index) => {
    if (!link.href.trim()) add('link-href', 'Link has no destination', 'error', `links[${index}]`);
    if (!link.text?.trim() && !/\b(aria-label|title)\b/.test(link.rel ?? '')) {
      add('link-text', 'Link has no descriptive text in the audit snapshot', 'warning', `links[${index}]`);
    }
  });
  for (const error of page.consoleErrors ?? []) add('console-error', error);
  for (const error of page.hydrationErrors ?? []) add('hydration-error', error);

  return findings;
}

export interface SeoToolingVersions {
  lighthouseCi: string;
  linkinator: string;
  axeCore: string;
  htmlValidate: string;
  puppeteer: string;
}

export const recommendedSeoTooling: SeoToolingVersions = {
  lighthouseCi: '0.15.1',
  linkinator: '7.6.1',
  axeCore: '4.12.1',
  htmlValidate: '11.5.6',
  puppeteer: '25.3.0',
};

export const seoAuditRuntime = {
  minimumNodeVersion: 22,
  note: 'The complete audit toolchain requires Node 22 even though web-foundation runtime supports Node 20.',
} as const;
