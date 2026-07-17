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
