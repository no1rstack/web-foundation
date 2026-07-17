import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { MetadataBuilder, renderMetadataTags, validateMetadata } from '../src/seo/metadata.js';
import { generateSitemapXml, generateSitemapIndex, escapeXml, prepareSitemapEntries, validateSitemapEntry } from '../src/seo/sitemap.js';
import { buildOrganizationSchema, buildBreadcrumbSchema, buildFAQSchema, buildPersonSchema, buildCreativeWorkSchema, buildEventSchema, buildProductSchema, renderJsonLd, validateRichResultData } from '../src/seo/structured-data.js';

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


describe('SEO compatibility hardening', () => {
  it('renders canonical, social, localized, and theme metadata', () => {
    const builder = new MetadataBuilder({
      baseUrl: 'https://example.com',
      brandName: 'Example',
      defaultTitle: 'Example platform',
      defaultDescription: 'A complete platform description suitable for search and social previews.',
      themeColor: '#101416',
    });
    const html = renderMetadataTags(builder.buildAll({
      title: 'Database control plane',
      description: 'Operate databases, APIs, identity, realtime services, and infrastructure from one governed workspace.',
      path: '/platform',
      locale: 'en_US',
      alternates: [
        { hrefLang: 'en', href: 'https://example.com/platform' },
        { hrefLang: 'x-default', href: 'https://example.com/platform' },
      ],
    }));
    assert.match(html, /rel="canonical" href="https:\/\/example\.com\/platform"/);
    assert.match(html, /name="twitter:title"/);
    assert.match(html, /property="og:locale" content="en_US"/);
    assert.match(html, /hreflang="x-default"/);
    assert.match(html, /name="theme-color"/);
  });

  it('prevents JSON-LD from terminating its script element', () => {
    const html = renderJsonLd({
      '@context': 'https://schema.org',
      '@type': 'Thing',
      name: '</script><script>alert(1)</script>',
    });
    assert.equal(html.includes('</script><script>'), false);
    assert.match(html, /\\u003c\/script>/);
  });

  it('validates, deduplicates, and sorts sitemap entries', () => {
    const entries = prepareSitemapEntries([
      { loc: 'https://example.com/z', priority: 0.5 },
      { loc: 'not-a-url' },
      { loc: 'https://example.com/a', lastmod: '2026-01-01' },
      { loc: 'https://example.com/z', priority: 0.5 },
    ]);
    assert.deepEqual(entries.map((entry) => entry.loc), ['https://example.com/a', 'https://example.com/z']);
    assert.equal(validateSitemapEntry({ loc: 'https://example.com/#fragment' }).valid, false);
  });
});


describe('semantic entity vocabulary', () => {
  it('models verified Person and CreativeWork relationships', () => {
    const person = buildPersonSchema({
      name: 'Avery Analyst',
      url: 'https://example.com/people/avery',
      worksFor: { name: 'Example', url: 'https://example.com' },
      sameAs: ['https://www.wikidata.org/wiki/Q1'],
    });
    const work = buildCreativeWorkSchema({
      name: 'Infrastructure field guide',
      url: 'https://example.com/guides/infrastructure',
      author: { name: 'Avery Analyst', url: 'https://example.com/people/avery' },
      publisher: { name: 'Example', url: 'https://example.com' },
    });
    assert.equal(person['@type'], 'Person');
    assert.equal((person.worksFor as Record<string, unknown>).name, 'Example');
    assert.equal(work['@type'], 'CreativeWork');
    assert.equal((work.author as Record<string, unknown>).name, 'Avery Analyst');
  });

  it('models Event dates, location, organizer, and transactional offers', () => {
    const event = buildEventSchema({
      name: 'Platform briefing',
      url: 'https://example.com/events/briefing',
      startDate: new Date('2026-09-01T14:00:00Z'),
      endDate: new Date('2026-09-01T15:00:00Z'),
      eventAttendanceMode: 'OnlineEventAttendanceMode',
      location: { name: 'Live stream', url: 'https://example.com/live/briefing' },
      organizer: { name: 'Example', url: 'https://example.com' },
      offers: [{ price: 0, priceCurrency: 'USD', availability: 'InStock' }],
    });
    assert.equal(event['@type'], 'Event');
    assert.equal(event.startDate, '2026-09-01T14:00:00.000Z');
    assert.equal(validateRichResultData(event).valid, true);
  });

  it('validates Product rich-result transactional data', () => {
    const product = buildProductSchema({
      name: 'Platform license',
      description: 'A managed platform license.',
      url: 'https://example.com/products/platform',
      offers: { price: 99, priceCurrency: 'USD', availability: 'InStock' },
      review: { ratingValue: 4.8, reviewCount: 37 },
    });
    assert.equal(validateRichResultData(product).valid, true);
    assert.equal((product.aggregateRating as Record<string, unknown>).reviewCount, 37);
  });

  it('supports organization subtypes and sameAs authority links', () => {
    const organization = buildOrganizationSchema({
      name: 'Example Foundation',
      schemaType: 'NGO',
      url: 'https://example.org',
      sameAs: ['https://www.wikidata.org/wiki/Q2'],
    });
    assert.equal(organization['@type'], 'NGO');
    assert.deepEqual(organization.sameAs, ['https://www.wikidata.org/wiki/Q2']);
  });
});
