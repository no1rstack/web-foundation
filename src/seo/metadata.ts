import type { AlternateLanguage, MetadataTemplates, OpenGraphData, StructuredDataPayload } from '../types.js';

export interface PageMetadata {
  title: string;
  description: string;
  canonicalUrl?: string;
  robots?: string;
  og?: OpenGraphData;
  structuredData?: Record<string, unknown>;
  breadcrumbs?: Array<{ name: string; url: string }>;
  alternates?: AlternateLanguage[];
  themeColor?: string;
}

export interface MetadataInput {
  title?: string;
  description?: string;
  path?: string;
  ogImage?: string;
  ogType?: string;
  publishedAt?: Date;
  modifiedAt?: Date;
  author?: string;
  section?: string;
  locale?: string;
  alternates?: AlternateLanguage[];
  robots?: string;
  structuredData?: StructuredDataPayload | StructuredDataPayload[];
}

export class MetadataBuilder {
  private templates: MetadataTemplates;
  private baseUrl: string;
  private brandName: string;
  private defaultTitle: string;
  private defaultDescription: string;
  private logo?: string;
  private themeColor?: string;

  constructor(opts: {
    templates?: MetadataTemplates;
    baseUrl: string;
    brandName: string;
    defaultTitle: string;
    defaultDescription: string;
    logo?: string;
    themeColor?: string;
  }) {
    this.templates = {
      titleSeparator: opts.templates?.titleSeparator || '|',
      titleSuffix: opts.templates?.titleSuffix || opts.brandName,
      ...opts.templates,
    };
    this.baseUrl = opts.baseUrl.replace(/\/$/, '');
    this.brandName = opts.brandName;
    this.defaultTitle = opts.defaultTitle;
    this.defaultDescription = opts.defaultDescription;
    this.logo = opts.logo;
    this.themeColor = opts.themeColor;
  }

  buildTitle(pageTitle?: string): string {
    const parts: string[] = [];
    const effectiveTitle = pageTitle || this.defaultTitle;

    if (effectiveTitle) parts.push(effectiveTitle);
    if (this.templates.titleSuffix && effectiveTitle !== this.templates.titleSuffix) {
      parts.push(this.templates.titleSuffix);
    }

    return parts.join(` ${this.templates.titleSeparator || '|'} `);
  }

  buildDescription(desc?: string): string {
    return desc || this.defaultDescription;
  }

  buildCanonicalUrl(path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}${normalizedPath}`;
  }

  buildRobotsDirective(opts?: {
    index?: boolean;
    follow?: boolean;
    maxImagePreview?: 'none' | 'standard' | 'large';
    maxSnippet?: number;
    maxVideoPreview?: number;
  }): string {
    const directives: string[] = [];

    directives.push(opts?.index !== false ? 'index' : 'noindex');
    directives.push(opts?.follow !== false ? 'follow' : 'nofollow');

    if (opts?.maxImagePreview) directives.push(`max-image-preview:${opts.maxImagePreview}`);
    if (opts?.maxSnippet !== undefined) directives.push(`max-snippet:${opts.maxSnippet}`);
    if (opts?.maxVideoPreview !== undefined) directives.push(`max-video-preview:${opts.maxVideoPreview}`);

    return directives.join(', ');
  }

  buildOpenGraph(input: MetadataInput): OpenGraphData {
    const title = this.buildTitle(input.title);
    const description = this.buildDescription(input.description);
    const url = input.path ? this.buildCanonicalUrl(input.path) : this.baseUrl;

    const ogImage = input.ogImage || this.logo || this.defaultOgImage();

    return {
      ogTitle: title,
      ogDescription: description,
      ogImage,
      ogUrl: url,
      ogType: input.ogType || 'website',
      ogSiteName: this.brandName,
      ogLocale: input.locale,
      twitterCard: this.determineTwitterCard(input.ogType),
      twitterImage: ogImage,
    };
  }

  buildAll(input: MetadataInput): PageMetadata {
    return {
      title: this.buildTitle(input.title),
      description: this.buildDescription(input.description),
      canonicalUrl: input.path ? this.buildCanonicalUrl(input.path) : undefined,
      robots: input.robots || this.buildRobotsDirective(),
      og: this.buildOpenGraph(input),
      structuredData: input.structuredData as Record<string, unknown> | undefined,
      alternates: input.alternates,
      themeColor: this.themeColor,
    };
  }

  private defaultOgImage(): string {
    return `${this.baseUrl}/og-image.png`;
  }

  private determineTwitterCard(ogType?: string): 'summary' | 'summary_large_image' {
    return ogType === 'article' || ogType === 'product' ? 'summary_large_image' : 'summary';
  }

  get openGraphTags(): (input: MetadataInput) => string {
    return (input: MetadataInput) => {
      const og = this.buildOpenGraph(input);
      return this.renderOpenGraphTags(og);
    };
  }

  private renderOpenGraphTags(og: OpenGraphData): string {
    const tags: string[] = [
      `<meta property="og:title" content="${escapeAttr(og.ogTitle)}">`,
      `<meta property="og:description" content="${escapeAttr(og.ogDescription)}">`,
      `<meta property="og:image" content="${escapeAttr(og.ogImage)}">`,
      `<meta property="og:url" content="${escapeAttr(og.ogUrl)}">`,
      `<meta property="og:type" content="${escapeAttr(og.ogType)}">`,
    ];

    if (og.ogSiteName) {
      tags.push(`<meta property="og:site_name" content="${escapeAttr(og.ogSiteName)}">`);
    }
    if (og.ogLocale) {
      tags.push(`<meta property="og:locale" content="${escapeAttr(og.ogLocale)}">`);
    }
    if (og.twitterCard) {
      tags.push(`<meta name="twitter:card" content="${escapeAttr(og.twitterCard)}">`);
    }
    if (og.twitterSite) {
      tags.push(`<meta name="twitter:site" content="${escapeAttr(og.twitterSite)}">`);
    }
    if (og.twitterCreator) {
      tags.push(`<meta name="twitter:creator" content="${escapeAttr(og.twitterCreator)}">`);
    }
    if (og.twitterImage) {
      tags.push(`<meta name="twitter:image" content="${escapeAttr(og.twitterImage)}">`);
    }

    return tags.join('\n');
  }
}

export function escapeAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function validateMetadata(metadata: PageMetadata): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (!metadata.title || metadata.title.length < 10) {
    issues.push('Title too short or missing (minimum 10 characters)');
  }
  if (metadata.title && metadata.title.length > 70) {
    issues.push('Title too long (maximum 70 characters recommended)');
  }
  if (!metadata.description || metadata.description.length < 50) {
    issues.push('Description too short or missing (minimum 50 characters)');
  }
  if (metadata.description && metadata.description.length > 160) {
    issues.push('Description too long (maximum 160 characters recommended)');
  }
  if (!metadata.canonicalUrl) {
    issues.push('Missing canonical URL');
  }
  if (!metadata.og) {
    issues.push('Missing OpenGraph data');
  } else {
    if (!metadata.og.ogTitle) issues.push('Missing og:title');
    if (!metadata.og.ogDescription) issues.push('Missing og:description');
    if (!metadata.og.ogImage) issues.push('Missing og:image');
  }

  return { valid: issues.length === 0, issues };
}


export function renderMetadataTags(metadata: PageMetadata): string {
  const tags: string[] = [
    `<title>${escapeText(metadata.title)}</title>`,
    `<meta name="description" content="${escapeAttr(metadata.description)}">`,
  ];
  if (metadata.robots) tags.push(`<meta name="robots" content="${escapeAttr(metadata.robots)}">`);
  if (metadata.canonicalUrl) tags.push(`<link rel="canonical" href="${escapeAttr(metadata.canonicalUrl)}">`);
  if (metadata.themeColor) tags.push(`<meta name="theme-color" content="${escapeAttr(metadata.themeColor)}">`);
  for (const alternate of metadata.alternates || []) {
    tags.push(`<link rel="alternate" hreflang="${escapeAttr(alternate.hrefLang)}" href="${escapeAttr(alternate.href)}">`);
  }
  if (metadata.og) {
    const og = metadata.og;
    tags.push(`<meta property="og:title" content="${escapeAttr(og.ogTitle)}">`);
    tags.push(`<meta property="og:description" content="${escapeAttr(og.ogDescription)}">`);
    tags.push(`<meta property="og:image" content="${escapeAttr(og.ogImage)}">`);
    tags.push(`<meta property="og:url" content="${escapeAttr(og.ogUrl)}">`);
    tags.push(`<meta property="og:type" content="${escapeAttr(og.ogType)}">`);
    if (og.ogSiteName) tags.push(`<meta property="og:site_name" content="${escapeAttr(og.ogSiteName)}">`);
    if (og.ogLocale) tags.push(`<meta property="og:locale" content="${escapeAttr(og.ogLocale)}">`);
    if (og.twitterCard) tags.push(`<meta name="twitter:card" content="${escapeAttr(og.twitterCard)}">`);
    tags.push(`<meta name="twitter:title" content="${escapeAttr(og.ogTitle)}">`);
    tags.push(`<meta name="twitter:description" content="${escapeAttr(og.ogDescription)}">`);
    tags.push(`<meta name="twitter:image" content="${escapeAttr(og.twitterImage || og.ogImage)}">`);
    if (og.twitterSite) tags.push(`<meta name="twitter:site" content="${escapeAttr(og.twitterSite)}">`);
    if (og.twitterCreator) tags.push(`<meta name="twitter:creator" content="${escapeAttr(og.twitterCreator)}">`);
  }
  if (metadata.structuredData) {
    const values = Array.isArray(metadata.structuredData) ? metadata.structuredData : [metadata.structuredData];
    for (const value of values) {
      const json = JSON.stringify(value).replace(/</g, '\\u003c');
      tags.push(`<script type="application/ld+json">${json}</script>`);
    }
  }
  return tags.join('\n');
}

function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
