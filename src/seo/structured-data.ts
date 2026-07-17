import type { StructuredDataPayload } from '../types.js';

export interface OrgSchemaInput {
  name: string;
  url: string;
  logo?: string;
  sameAs?: string[];
  description?: string;
}

export function buildOrganizationSchema(input: OrgSchemaInput): StructuredDataPayload {
  const ld: StructuredDataPayload = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: input.name,
    url: input.url,
  };

  if (input.logo) ld.logo = input.logo;
  if (input.sameAs && input.sameAs.length > 0) ld.sameAs = input.sameAs;
  if (input.description) ld.description = input.description;

  return ld;
}

export interface WebSiteSchemaInput {
  name: string;
  url: string;
  description?: string;
  potentialAction?: {
    target: string;
    queryInput: string;
  };
}

export function buildWebSiteSchema(input: WebSiteSchemaInput): StructuredDataPayload {
  const ld: StructuredDataPayload = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: input.name,
    url: input.url,
  };

  if (input.description) ld.description = input.description;
  if (input.potentialAction) {
    ld.potentialAction = {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: input.potentialAction.target,
      },
      'query-input': input.potentialAction.queryInput,
    };
  }

  return ld;
}

export interface ProductSchemaInput {
  name: string;
  description: string;
  url: string;
  image?: string[];
  offers?: {
    price: number;
    priceCurrency: string;
    availability?: 'InStock' | 'OutOfStock' | 'PreOrder' | 'OnlineOnly';
    url?: string;
  };
  review?: {
    ratingValue: number;
    bestRating?: number;
    reviewCount?: number;
  };
  brand?: { name: string; url?: string };
}

export function buildProductSchema(input: ProductSchemaInput): StructuredDataPayload {
  const ld: StructuredDataPayload = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.name,
    description: input.description,
    url: input.url,
  };

  if (input.image) ld.image = input.image;
  if (input.brand) {
    ld.brand = {
      '@type': 'Brand',
      name: input.brand.name,
      ...(input.brand.url ? { url: input.brand.url } : {}),
    };
  }
  if (input.offers) {
    ld.offers = {
      '@type': 'Offer',
      price: input.offers.price,
      priceCurrency: input.offers.priceCurrency,
      ...(input.offers.availability ? { availability: `https://schema.org/${input.offers.availability}` } : {}),
      ...(input.offers.url ? { url: input.offers.url } : {}),
    };
  }
  if (input.review) {
    ld.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: input.review.ratingValue,
      bestRating: input.review.bestRating || 5,
      reviewCount: input.review.reviewCount || 0,
    };
  }

  return ld;
}

export interface SoftwareAppSchemaInput {
  name: string;
  description: string;
  url: string;
  applicationCategory?: string;
  operatingSystem?: string;
  offers?: {
    price: number;
    priceCurrency: string;
  };
  datePublished?: Date;
  dateModified?: Date;
  author?: { name: string; url?: string };
}

export function buildSoftwareApplicationSchema(input: SoftwareAppSchemaInput): StructuredDataPayload {
  const ld: StructuredDataPayload = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: input.name,
    description: input.description,
    url: input.url,
    applicationCategory: input.applicationCategory || 'UtilityApplication',
    operatingSystem: input.operatingSystem || 'Web Browser',
  };

  if (input.offers) {
    ld.offers = {
      '@type': 'Offer',
      price: input.offers.price,
      priceCurrency: input.offers.priceCurrency,
    };
  }

  if (input.datePublished) ld.datePublished = input.datePublished.toISOString();
  if (input.dateModified) ld.dateModified = input.dateModified.toISOString();
  if (input.author) {
    ld.author = {
      '@type': input.author.url ? 'Person' : 'Organization',
      name: input.author.name,
      ...(input.author.url ? { url: input.author.url } : {}),
    };
  }

  return ld;
}

export interface ArticleSchemaInput {
  headline: string;
  description: string;
  url: string;
  datePublished: Date;
  dateModified?: Date;
  author?: { name: string; url?: string };
  publisher?: { name: string; logo?: string };
  image?: string[];
  articleBody?: string;
  wordCount?: number;
}

export function buildArticleSchema(input: ArticleSchemaInput): StructuredDataPayload {
  const ld: StructuredDataPayload = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.headline,
    description: input.description,
    url: input.url,
    datePublished: input.datePublished.toISOString(),
  };

  if (input.dateModified) ld.dateModified = input.dateModified.toISOString();
  if (input.author) {
    ld.author = {
      '@type': 'Person',
      name: input.author.name,
      ...(input.author.url ? { url: input.author.url } : {}),
    };
  }
  if (input.publisher) {
    ld.publisher = {
      '@type': 'Organization',
      name: input.publisher.name,
      ...(input.publisher.logo ? { logo: { '@type': 'ImageObject', url: input.publisher.logo } } : {}),
    };
  }
  if (input.image) ld.image = input.image;
  if (input.articleBody) ld.articleBody = input.articleBody;
  if (input.wordCount) ld.wordCount = input.wordCount;

  return ld;
}

export interface FAQSchemaInput {
  items: Array<{ question: string; answer: string }>;
}

export function buildFAQSchema(input: FAQSchemaInput): StructuredDataPayload {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: input.items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export interface HowToSchemaInput {
  name: string;
  description: string;
  steps: Array<{
    name: string;
    text: string;
    image?: string;
    url?: string;
  }>;
  totalTime?: string;
  tools?: string[];
  supplies?: string[];
}

export function buildHowToSchema(input: HowToSchemaInput): StructuredDataPayload {
  const ld: StructuredDataPayload = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: input.name,
    description: input.description,
    step: input.steps.map((step, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: step.name,
      ...(step.text ? { itemListElement: { '@type': 'HowToDirection', text: step.text } } : {}),
      ...(step.image ? { image: step.image } : {}),
      ...(step.url ? { url: step.url } : {}),
    })),
  };

  if (input.totalTime) ld.totalTime = input.totalTime;
  if (input.tools) ld.tool = input.tools.map((t) => ({ '@type': 'HowToTool', name: t }));
  if (input.supplies) ld.supply = input.supplies.map((s) => ({ '@type': 'HowToSupply', name: s }));

  return ld;
}

export interface BreadcrumbSchemaInput {
  items: Array<{ name: string; url: string }>;
}

export function buildBreadcrumbSchema(input: BreadcrumbSchemaInput): StructuredDataPayload {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: input.items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function buildBlogPostingSchema(input: ArticleSchemaInput): StructuredDataPayload {
  const base = buildArticleSchema(input);
  (base as Record<string, unknown>)['@type'] = 'BlogPosting';
  return base;
}

export interface CourseSchemaInput {
  name: string;
  description: string;
  provider: { name: string; url: string };
  educationalLevel?: string;
  timeRequired?: string;
  teaches?: string[];
}

export function buildCourseSchema(input: CourseSchemaInput): StructuredDataPayload {
  const ld: StructuredDataPayload = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: input.name,
    description: input.description,
    provider: {
      '@type': 'Organization',
      name: input.provider.name,
      url: input.provider.url,
    },
  };

  if (input.educationalLevel) ld.educationalLevel = input.educationalLevel;
  if (input.timeRequired) ld.timeRequired = input.timeRequired;
  if (input.teaches) ld.teaches = input.teaches;

  return ld;
}

export interface DocumentationSchemaInput {
  headline: string;
  description: string;
  url: string;
  datePublished?: Date;
  dateModified?: Date;
  version?: string;
  programmingLanguage?: string;
}

export function buildDocumentationSchema(input: DocumentationSchemaInput): StructuredDataPayload {
  const ld: StructuredDataPayload = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: input.headline,
    description: input.description,
    url: input.url,
  };

  if (input.datePublished) ld.datePublished = input.datePublished.toISOString();
  if (input.dateModified) ld.dateModified = input.dateModified.toISOString();
  if (input.version) ld.version = input.version;
  if (input.programmingLanguage) ld.programmingLanguage = input.programmingLanguage;

  return ld;
}

export function renderJsonLd(data: StructuredDataPayload | StructuredDataPayload[]): string {
  const payloads = Array.isArray(data) ? data : [data];
  return payloads
    .map((p) => `<script type="application/ld+json">${JSON.stringify(p).replace(/</g, '\\u003c')}</script>`)
    .join('\n');
}

export function validateStructuredData(
  data: StructuredDataPayload
): { valid: boolean; missingRequired: string[] } {
  const missingRequired: string[] = [];

  if (!data['@context'] || data['@context'] !== 'https://schema.org') {
    missingRequired.push('@context must be "https://schema.org"');
  }
  if (!data['@type']) {
    missingRequired.push('@type is required');
  }

  return { valid: missingRequired.length === 0, missingRequired };
}
