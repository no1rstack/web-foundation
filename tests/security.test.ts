import test from 'node:test';
import assert from 'node:assert/strict';
import { applySecurityHeaders, resolveSecurityConfig } from '../src/middleware/security-headers.js';
import { extractClientIp } from '../src/middleware/ip-tracking.js';
import { buildFullCanonicalUrl } from '../src/middleware/canonical-url.js';
import { generateRobotsTxt, resolveRobotsConfig } from '../src/middleware/robots.js';

test('production CSP excludes unsafe evaluation', () => {
  const config = resolveSecurityConfig(undefined, 'production');
  assert.equal(config.contentSecurityPolicy?.includes("'unsafe-eval'"), false);
  assert.match(String(config.contentSecurityPolicy), /object-src 'none'/);
  assert.match(String(config.contentSecurityPolicy), /base-uri 'self'/);
});

test('security headers are applied from the resolved policy', () => {
  const headers = new Map<string, string>();
  applySecurityHeaders({ setHeader: (name, value) => headers.set(name, value) }, resolveSecurityConfig(undefined, 'production'));
  assert.ok(headers.has('Content-Security-Policy'));
  assert.equal(headers.get('X-Content-Type-Options'), 'nosniff');
  assert.match(String(headers.get('Strict-Transport-Security')), /max-age=31536000/);
});

test('forwarded client IP is ignored unless proxy trust is explicit', () => {
  const headers = { 'x-forwarded-for': '203.0.113.8, 10.0.0.4' };
  assert.equal(extractClientIp(headers, '10.0.0.2', false), '10.0.0.2');
  assert.equal(extractClientIp(headers, '10.0.0.2', true), '203.0.113.8');
});


test('canonical URL builder accepts a domain or a full origin', () => {
  assert.equal(buildFullCanonicalUrl('example.com', '/docs'), 'https://example.com/docs');
  assert.equal(buildFullCanonicalUrl('https://example.com/', '/docs'), 'https://example.com/docs');
});

test('robots output keeps disallow rules effective for every crawler', () => {
  const output = generateRobotsTxt('https://example.com', resolveRobotsConfig(undefined, 'production'));
  assert.match(output, /User-agent: \*/);
  assert.match(output, /Disallow: \/api\/\*/);
  assert.equal(output.includes('User-agent: Googlebot'), false);
});
