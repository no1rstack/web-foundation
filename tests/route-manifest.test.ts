import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { MetadataBuilder } from '../src/seo/metadata.js';
import { applyBrowserMetadata, type BrowserDocumentLike, type BrowserElementLike } from '../src/seo/browser-metadata.js';
import { defineRouteManifest } from '../src/seo/route-manifest.js';

const manifest = defineRouteManifest([
  {
    path: '/',
    title: 'Example developer platform',
    description: 'Build and operate governed data services from one workspace.',
    navLabel: 'Home',
    showInNavigation: false,
    changefreq: 'weekly',
    priority: 1,
  },
  {
    path: '/docs',
    aliases: ['/documentation'],
    title: 'Developer documentation',
    description: 'Read guides, API references, and architecture documentation.',
    navLabel: 'Documentation',
    schemaType: 'CollectionPage',
    changefreq: 'weekly',
    priority: 0.8,
    ogImage: 'https://example.com/social.jpg',
  },
]);

describe('route manifest', () => {
  it('resolves aliases directly to canonical routes', () => {
    const resolved = manifest.resolve('/documentation');
    assert.equal(resolved?.canonicalPath, '/docs');
    assert.equal(resolved?.isAlias, true);
  });

  it('preserves nested paths while replacing an alias prefix', () => {
    assert.equal(manifest.canonicalPath('/documentation/install'), '/docs/install');
  });

  it('drives navigation, sitemap, robots, breadcrumbs, and metadata', () => {
    assert.deepEqual(manifest.navigation(), [{ href: '/docs', label: 'Documentation' }]);
    assert.deepEqual(manifest.robotsAllowPaths(), ['/', '/docs']);
    assert.equal(manifest.sitemap('https://example.com')[1].loc, 'https://example.com/docs');
    assert.deepEqual(manifest.breadcrumbs('/docs', 'https://example.com'), [
      { name: 'Home', url: 'https://example.com/' },
      { name: 'Documentation', url: 'https://example.com/docs' },
    ]);
    assert.equal(manifest.metadata('/documentation')?.path, '/docs');
  });

  it('rejects duplicate canonical or alias paths', () => {
    assert.throws(() => defineRouteManifest([
      { path: '/one', aliases: ['/shared'], title: 'One page title', description: 'One complete page description.', navLabel: 'One' },
      { path: '/two', aliases: ['/shared'], title: 'Two page title', description: 'Two complete page description.', navLabel: 'Two' },
    ]), /claimed by both/);
  });
});

class FakeElement implements BrowserElementLike {
  content?: string;
  href?: string;
  rel?: string;
  attributes = new Map<string, string>();
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
}

class FakeDocument implements BrowserDocumentLike {
  title = '';
  head = { appendChild: (node: BrowserElementLike) => { this.nodes.push(node as FakeElement); } };
  nodes: FakeElement[] = [];
  querySelector(selector: string): FakeElement | null {
    const match = selector.match(/^(meta|link)\[(name|property|rel)="([^"]+)"\]$/);
    if (!match) return null;
    const [, , attribute, value] = match;
    return this.nodes.find((node) =>
      attribute === 'rel' ? node.rel === value : node.attributes.get(attribute) === value
    ) ?? null;
  }
  createElement() { return new FakeElement(); }
}

describe('browser metadata synchronization', () => {
  it('upserts canonical, Open Graph, Twitter, robots, and image metadata', () => {
    const builder = new MetadataBuilder({
      baseUrl: 'https://example.com',
      brandName: 'Example',
      defaultTitle: 'Example platform',
      defaultDescription: 'A complete platform description.',
    });
    const metadata = builder.buildAll({
      title: 'Documentation',
      description: 'Read complete developer documentation for the platform.',
      path: '/docs',
      ogImage: 'https://example.com/social.jpg',
      locale: 'en_US',
      robots: 'index,follow,max-image-preview:large',
    });
    const document = new FakeDocument();
    applyBrowserMetadata(document, metadata, {
      socialImage: { width: 1200, height: 630, alt: 'Example platform topology' },
    });

    assert.equal(document.title, 'Documentation | Example');
    assert.equal(document.querySelector('link[rel="canonical"]')?.href, 'https://example.com/docs');
    assert.equal(document.querySelector('meta[property="og:image:width"]')?.content, '1200');
    assert.equal(document.querySelector('meta[name="twitter:image:alt"]')?.content, 'Example platform topology');
    assert.equal(document.querySelector('meta[name="robots"]')?.content, 'index,follow,max-image-preview:large');
  });
});
