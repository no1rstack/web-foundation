import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { MetadataBuilder, validateMetadata } from '../src/seo/metadata.js';
import { generateSitemapXml, generateSitemapIndex, escapeXml } from '../src/seo/sitemap.js';
import { buildOrganizationSchema, buildBreadcrumbSchema, buildFAQSchema, renderJsonLd } from '../src/seo/structured-data.js';

describe('seo', () => {
  describe('MetadataBuilder', () => {
    const builder = new MetadataBuilder({
      baseUrl: 'https://example.com',
      brandName: 'ExampleCo',
      defaultTitle: 'ExampleCo - Default Title',
      defaultDescription: 'Default description for ExampleCo.',
    });

    it('builds title with suffix', () => {
      const title = builder.buildTitle('My Page');
      assert.strictEqual(title, 'My Page | ExampleCo');
    });

    it('builds canonical URL', () => {
      const url = builder.buildCanonicalUrl('/about');
      assert.strictEqual(url, 'https://example.com/about');
    });

    it('builds OpenGraph data', () => {
      const og = builder.buildOpenGraph({
        title: 'About',
        description: 'About our company',
        path: '/about',
      });
      assert.strictEqual(og.ogTitle, 'About | ExampleCo');
      assert.strictEqual(og.ogUrl, 'https://example.com/about');
      assert.strictEqual(og.ogSiteName, 'ExampleCo');
    });

    it('builds complete metadata', () => {
      const meta = builder.buildAll({
        title: 'Contact',
        description: 'Contact us today.',
        path: '/contact',
      });
      assert.strictEqual(meta.title, 'Contact | ExampleCo');
      assert.strictEqual(meta.canonicalUrl, 'https://example.com/contact');
      assert.ok(meta.og);
    });
  });

  describe('validateMetadata', () => {
    it('flags too short title', () => {
      const result = validateMetadata({
        title: 'Hi',
        description: 'A reasonably long description that is definitely over fifty characters long for testing.',
        canonicalUrl: 'https://example.com/page',
        robots: 'index, follow',
      });
      assert.strictEqual(result.valid, false);
      assert.ok(result.issues.some((i) => i.includes('Title')));
    });

    it('passes valid metadata', () => {
      const result = validateMetadata({
        title: 'A Good Page Title Here',
        description: 'A reasonably long description that is definitely over fifty characters long for testing purposes.',
        canonicalUrl: 'https://example.com/page',
        robots: 'index, follow',
        og: {
          ogTitle: 'A Good Page Title Here',
          ogDescription: 'A reasonably long description.',
          ogImage: 'https://example.com/og.png',
          ogUrl: 'https://example.com/page',
          ogType: 'website',
        },
      });
      assert.strictEqual(result.valid, true);
    });
  });

  describe('sitemap', () => {
    it('generates valid sitemap XML', () => {
      const xml = generateSitemapXml([{
        loc: 'https://example.com/page',
        lastmod: '2024-01-01',
        changefreq: 'weekly',
        priority: 0.8,
      }]);
      assert.ok(xml.includes('<urlset'));
      assert.ok(xml.includes('<loc>https://example.com/page</loc>'));
    });

    it('generates sitemap index', () => {
      const index = generateSitemapIndex([
        { loc: 'https://example.com/sitemap-pages.xml' },
        { loc: 'https://example.com/sitemap-blog.xml' },
      ]);
      assert.ok(index.includes('<sitemapindex'));
      assert.ok(index.includes('<sitemap>'));
    });

    it('escapes XML entities', () => {
      const xml = generateSitemapXml([{
        loc: 'https://example.com/page?q=test&ref=link',
      }]);
      assert.ok(xml.includes('&amp;'));
    });
  });

  describe('structured data', () => {
    it('builds Organization schema', () => {
      const schema = buildOrganizationSchema({
        name: 'ExampleCo',
        url: 'https://example.com',
      });
      assert.strictEqual(schema['@type'], 'Organization');
      assert.strictEqual(schema['@context'], 'https://schema.org');
    });

    it('builds BreadcrumbList schema', () => {
      const schema = buildBreadcrumbSchema({
        items: [
          { name: 'Home', url: 'https://example.com/' },
          { name: 'Blog', url: 'https://example.com/blog' },
        ],
      });
      assert.strictEqual(schema['@type'], 'BreadcrumbList');
      assert.ok(Array.isArray(schema.itemListElement));
      assert.strictEqual((schema.itemListElement as any[]).length, 2);
    });

    it('builds FAQ schema', () => {
      const schema = buildFAQSchema({
        items: [
          { question: 'What is this?', answer: 'A test.' },
        ],
      });
      assert.strictEqual(schema['@type'], 'FAQPage');
      assert.ok(Array.isArray(schema.mainEntity));
    });

    it('renders JSON-LD script tags', () => {
      const html = renderJsonLd(
        buildOrganizationSchema({ name: 'Test', url: 'https://test.com' })
      );
      assert.ok(html.includes('<script type="application/ld+json">'));
      assert.ok(html.includes('"@type":"Organization"'));
    });
  });
});
