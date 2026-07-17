import test from 'node:test';
import assert from 'node:assert/strict';
import { createExpressMiddleware } from '../src/adapters/express/middleware.js';
import { createWebFoundation } from '../src/config/defaults.js';

function response() {
  const headers = new Map<string, string | number>();
  return {
    statusCode: 200,
    body: undefined as unknown,
    headers,
    setHeader(name: string, value: string | number) { headers.set(name, value); },
    status(code: number) { this.statusCode = code; return this; },
    json(value: unknown) { this.body = value; return this; },
    send(value: unknown) { this.body = value; return this; },
    type(value: string) { headers.set('Content-Type', value); return this; },
    redirect(code: number, value: string) { this.statusCode = code; this.body = value; return this; },
  };
}

test('Express adapter enforces the configured global rate limit', async () => {
  const config = createWebFoundation({
    environment: 'test',
    app: { name: 'Test', slug: 'test', baseUrl: 'https://example.test', brandName: 'Test', defaultTitle: 'Test app title', defaultDescription: 'A sufficiently complete test application description.' },
    ipTracking: { enabled: false },
    rateLimit: { enabled: true, globalWindowMs: 60_000, globalMax: 1 },
  });
  const middleware = createExpressMiddleware({ config }).rateLimiter();
  const req = { path: '/resource', method: 'GET', headers: {}, socket: { remoteAddress: '192.0.2.10' } };

  const first = response();
  let continued = false;
  await middleware(req, first, () => { continued = true; });
  assert.equal(continued, true);
  assert.equal(first.headers.get('X-RateLimit-Remaining'), 0);

  const second = response();
  continued = false;
  await middleware(req, second, () => { continued = true; });
  assert.equal(continued, false);
  assert.equal(second.statusCode, 429);
  assert.ok(second.headers.has('Retry-After'));
});


test('Express adapter serves generated XML sitemaps', async () => {
  const config = createWebFoundation({
    environment: 'test',
    app: { name: 'Test', slug: 'test', baseUrl: 'https://example.test', brandName: 'Test', defaultTitle: 'Test app title', defaultDescription: 'A sufficiently complete test application description.' },
  });
  const wf = createExpressMiddleware({
    config,
    sitemapSources: [{ name: 'pages', entries: [{ loc: 'https://example.test/' }, { loc: 'https://example.test/docs', lastmod: '2026-01-01' }] }],
  });
  const res = response();
  await wf.sitemapXml()({}, res, (error: unknown) => { throw error; });
  assert.equal(res.headers.get('Content-Type'), 'application/xml');
  assert.match(String(res.body), /<urlset/);
  assert.match(String(res.body), /https:\/\/example\.test\/docs/);
});

test('Express adapter exposes explicit crawl status helpers', () => {
  const config = createWebFoundation({
    environment: 'test',
    app: { name: 'Test', slug: 'test', baseUrl: 'https://example.test', brandName: 'Test', defaultTitle: 'Test app title', defaultDescription: 'A sufficiently complete test application description.' },
  });
  const wf = createExpressMiddleware({ config });

  const missing = response();
  wf.notFound()({}, missing);
  assert.equal(missing.statusCode, 404);

  const gone = response();
  wf.gone()({}, gone);
  assert.equal(gone.statusCode, 410);

  const moved = response();
  wf.permanentRedirect('/new-path')({}, moved);
  assert.equal(moved.statusCode, 301);
  assert.equal(moved.body, '/new-path');

  const failure = response();
  wf.errorHandler()(new Error('secret'), {}, failure, () => {});
  assert.equal(failure.statusCode, 500);
  assert.deepEqual(failure.body, { error: 'Internal server error', status: 500 });
});
