import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveRobotsConfig,
  generateRobotsTxt,
  matchRobotsDirective,
  computeRobotsDirective,
} from '../src/middleware/robots.js';

describe('robots', () => {
  describe('resolveRobotsConfig', () => {
    it('returns production default for production env', () => {
      const config = resolveRobotsConfig(undefined, 'production');
      assert.strictEqual(config.defaultDirective, 'index,follow');
    });

    it('returns noindex for staging', () => {
      const config = resolveRobotsConfig(undefined, 'staging');
      assert.strictEqual(config.defaultDirective, 'noindex,nofollow');
    });

    it('merges custom disallow paths', () => {
      const config = resolveRobotsConfig(
        { disallowPaths: ['/custom/*'] },
        'production'
      );
      assert.strictEqual(config.disallowPaths.includes('/custom/*'), true);
      assert.strictEqual(config.disallowPaths.includes('/api/*'), true);
    });
  });

  describe('generateRobotsTxt', () => {
    it('includes sitemap reference', () => {
      const config = resolveRobotsConfig(undefined, 'production');
      const txt = generateRobotsTxt('https://example.com', config);
      assert.strictEqual(txt.includes('Sitemap: https://example.com/sitemap.xml'), true);
    });

    it('includes crawl delay when set', () => {
      const config = resolveRobotsConfig({ crawlDelay: 5 }, 'production');
      const txt = generateRobotsTxt('https://example.com', config);
      assert.strictEqual(txt.includes('Crawl-delay: 5'), true);
    });
  });

  describe('matchRobotsDirective', () => {
    it('matches pattern by path', () => {
      const result = matchRobotsDirective('/api/test', [
        { pattern: '/api/*', directive: 'noindex,nofollow', sitemapInclude: false },
      ]);
      assert.strictEqual(result.directive, 'noindex,nofollow');
    });

    it('returns default for unmatched', () => {
      const result = matchRobotsDirective('/public/page', []);
      assert.strictEqual(result.directive, 'index,follow');
    });
  });

  describe('computeRobotsDirective', () => {
    it('returns noindex for duplicate', () => {
      const result = computeRobotsDirective({
        isIndexable: true,
        hasUniqueContent: true,
        qualityScore: 80,
        isDuplicate: true,
      });
      assert.strictEqual(result, 'noindex,follow');
    });

    it('returns index for quality content', () => {
      const result = computeRobotsDirective({
        isIndexable: true,
        hasUniqueContent: true,
        qualityScore: 80,
        isDuplicate: false,
      });
      assert.strictEqual(result, 'index,follow');
    });
  });
});
