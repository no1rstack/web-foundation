import type { PageMetadata } from './metadata.js';

export interface BrowserElementLike {
  content?: string;
  href?: string;
  rel?: string;
  setAttribute(name: string, value: string): void;
}

export interface BrowserDocumentLike {
  title: string;
  head: { appendChild(node: BrowserElementLike): void };
  querySelector(selector: string): BrowserElementLike | null;
  createElement(tagName: string): BrowserElementLike;
}

export interface SocialImageMetadata {
  width?: number;
  height?: number;
  alt?: string;
}

function upsertMeta(
  document: BrowserDocumentLike,
  attribute: 'name' | 'property',
  key: string,
  content: string | undefined,
): void {
  if (!content) return;
  let element = document.querySelector(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

export function applyBrowserMetadata(
  document: BrowserDocumentLike,
  metadata: PageMetadata,
  options: { socialImage?: SocialImageMetadata } = {},
): void {
  document.title = metadata.title;
  upsertMeta(document, 'name', 'description', metadata.description);
  upsertMeta(document, 'name', 'robots', metadata.robots);

  if (metadata.themeColor) upsertMeta(document, 'name', 'theme-color', metadata.themeColor);

  if (metadata.canonicalUrl) {
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = metadata.canonicalUrl;
  }

  const og = metadata.og;
  if (!og) return;
  upsertMeta(document, 'property', 'og:title', og.ogTitle);
  upsertMeta(document, 'property', 'og:description', og.ogDescription);
  upsertMeta(document, 'property', 'og:image', og.ogImage);
  upsertMeta(document, 'property', 'og:url', og.ogUrl);
  upsertMeta(document, 'property', 'og:type', og.ogType);
  upsertMeta(document, 'property', 'og:site_name', og.ogSiteName);
  upsertMeta(document, 'property', 'og:locale', og.ogLocale);

  if (options.socialImage?.width) {
    upsertMeta(document, 'property', 'og:image:width', String(options.socialImage.width));
  }
  if (options.socialImage?.height) {
    upsertMeta(document, 'property', 'og:image:height', String(options.socialImage.height));
  }
  upsertMeta(document, 'property', 'og:image:alt', options.socialImage?.alt);

  upsertMeta(document, 'name', 'twitter:card', og.twitterCard);
  upsertMeta(document, 'name', 'twitter:title', og.ogTitle);
  upsertMeta(document, 'name', 'twitter:description', og.ogDescription);
  upsertMeta(document, 'name', 'twitter:image', og.twitterImage || og.ogImage);
  upsertMeta(document, 'name', 'twitter:image:alt', options.socialImage?.alt);
  upsertMeta(document, 'name', 'twitter:site', og.twitterSite);
  upsertMeta(document, 'name', 'twitter:creator', og.twitterCreator);
}
