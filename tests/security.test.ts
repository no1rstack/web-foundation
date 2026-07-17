import test from 'node:test';
import assert from 'node:assert/strict';
import { applySecurityHeaders, resolveSecurityConfig } from '../src/middleware/security-headers.js';
import { extractClientIp } from '../src/middleware/ip-tracking.js';

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
  assert.equal(extractClientIp(headers, '10.0.0.2'), '10.0.0.2');
  assert.equal(extractClientIp(headers, '10.0.0.2', true), '203.0.113.8');
});
