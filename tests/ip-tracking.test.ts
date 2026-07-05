import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { extractClientIp, hashIp, detectBot } from '../src/middleware/ip-tracking.js';

describe('ip-tracking', () => {
  describe('extractClientIp', () => {
    it('extracts from x-forwarded-for', () => {
      const ip = extractClientIp({ 'x-forwarded-for': '192.168.1.1, 10.0.0.1' });
      assert.strictEqual(ip, '192.168.1.1');
    });

    it('uses remoteAddress as fallback', () => {
      const ip = extractClientIp({}, '10.0.0.1');
      assert.strictEqual(ip, '10.0.0.1');
    });

    it('strips ipv6 prefix', () => {
      const ip = extractClientIp({ 'x-forwarded-for': '::ffff:192.168.1.1' });
      assert.strictEqual(ip, '192.168.1.1');
    });

    it('returns null for no IP', () => {
      const ip = extractClientIp({});
      assert.strictEqual(ip, null);
    });
  });

  describe('hashIp', () => {
    it('produces consistent hash', () => {
      const h1 = hashIp('192.168.1.1', 'test-salt');
      const h2 = hashIp('192.168.1.1', 'test-salt');
      assert.strictEqual(h1, h2);
    });

    it('produces different hash with different salt', () => {
      const h1 = hashIp('192.168.1.1', 'salt-a');
      const h2 = hashIp('192.168.1.1', 'salt-b');
      assert.notStrictEqual(h1, h2);
    });
  });

  describe('detectBot', () => {
    it('detects Googlebot', () => {
      const result = detectBot('Mozilla/5.0 (compatible; Googlebot/2.1)');
      assert.strictEqual(result.isBot, true);
      assert.strictEqual(result.botName, 'google');
    });

    it('detects bingbot', () => {
      const result = detectBot('bingbot/2.0');
      assert.strictEqual(result.isBot, true);
      assert.strictEqual(result.botName, 'bing');
    });

    it('detects generic bot', () => {
      const result = detectBot('SomeWebCrawler/1.0');
      assert.strictEqual(result.isBot, true);
      assert.ok(result.botScore > 0);
    });

    it('identifies human user agent', () => {
      const result = detectBot('Mozilla/5.0 Chrome/120');
      assert.strictEqual(result.isBot, false);
      assert.strictEqual(result.botScore, 0);
    });
  });
});
