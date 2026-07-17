import test from 'node:test';
import assert from 'node:assert/strict';
import { injectDocumentHead, prerenderRoutes, renderHtmlDocument } from '../src/rendering/document.js';

const metadata = {
  title: 'Crawlable platform page',
  description: 'A server-rendered page with complete metadata for search crawlers and social previews.',
  canonicalUrl: 'https://example.com/platform',
  robots: 'index,follow',
};

test('renders useful HTML before JavaScript executes', () => {
  const html = renderHtmlDocument({
    metadata,
    bodyHtml: '<main><h1>Platform content</h1><p>Rendered on the server.</p></main>',
    scripts: [{ src: '/assets/app.js', type: 'module' }],
  });
  assert.match(html, /^<!doctype html>/);
  assert.match(html, /<h1>Platform content<\/h1>/);
  assert.match(html, /rel="canonical"/);
  assert.match(html, /<script src="\/assets\/app.js" type="module"><\/script>/);
});

test('injects metadata into a Vite-style HTML template', () => {
  const html = injectDocumentHead('<!doctype html><html><head></head><body><div id="root"></div></body></html>', metadata);
  assert.match(html, /<title>Crawlable platform page<\/title>/);
  assert.match(html, /<div id="root"><\/div>/);
});

test('prerenders a static route manifest', async () => {
  const pages = await prerenderRoutes([{ path: '/platform', metadata }], async () => '<main>Static platform</main>');
  assert.equal(pages[0].path, '/platform');
  assert.match(pages[0].html, /Static platform/);
});
