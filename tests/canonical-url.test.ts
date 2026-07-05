import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeParams,
  computeCanonicalKey,
  isCrawlTrap,
  areParamsEquivalent,
  buildFullCanonicalUrl,
} from '../src/middleware/canonical-url.js';

describe('canonical-url', () => {
  describe('normalizeParams', () => {
    it('sorts keys alphabetically', () => {
      const result = normalizeParams(
        { z: 'last', a: 'first', m: 'middle' },
        [
          { key: 'z', type: 'string' },
          { key: 'a', type: 'string' },
          { key: 'm', type: 'string' },
        ]
      );
      assert.deepStrictEqual(Object.keys(result), ['a', 'm', 'z']);
    });

    it('applies defaults', () => {
      const result = normalizeParams(
        {},
        [{ key: 'count', type: 'int', default_value: '42' }]
      );
      assert.strictEqual(result['count'], 42);
    });

    it('coerces types', () => {
      const result = normalizeParams(
        { intVal: '10', boolVal: 'true', floatVal: '3.14' },
        [
          { key: 'intVal', type: 'int' },
          { key: 'boolVal', type: 'bool' },
          { key: 'floatVal', type: 'float' },
        ]
      );
      assert.strictEqual(result['intVal'], 10);
      assert.strictEqual(result['boolVal'], true);
      assert.strictEqual(result['floatVal'], 3.14);
    });

    it('skips empty values', () => {
      const result = normalizeParams(
        { keep: 'value', empty: '' },
        [{ key: 'keep', type: 'string' }, { key: 'empty', type: 'string' }]
      );
      assert.strictEqual(result['keep'], 'value');
      assert.strictEqual('empty' in result, false);
    });
  });

  describe('computeCanonicalKey', () => {
    it('produces consistent hash', () => {
      const a = computeCanonicalKey({ x: 1, y: 2 }, 'v1');
      const b = computeCanonicalKey({ x: 1, y: 2 }, 'v1');
      assert.strictEqual(a, b);
    });

    it('produces different hash for different params', () => {
      const a = computeCanonicalKey({ x: 1 }, 'v1');
      const b = computeCanonicalKey({ x: 2 }, 'v1');
      assert.notStrictEqual(a, b);
    });
  });

  describe('isCrawlTrap', () => {
    it('detects pagination traps', () => {
      assert.strictEqual(isCrawlTrap('/products?page=100'), true);
    });

    it('detects sort traps', () => {
      assert.strictEqual(isCrawlTrap('/products?sort=asc'), true);
    });

    it('allows normal URLs', () => {
      assert.strictEqual(isCrawlTrap('/products/widget'), false);
    });

    it('detects search traps', () => {
      assert.strictEqual(isCrawlTrap('/search?q=test'), true);
    });
  });

  describe('buildFullCanonicalUrl', () => {
    it('builds proper URL', () => {
      const url = buildFullCanonicalUrl('example.com', '/page/1');
      assert.strictEqual(url, 'https://example.com/page/1');
    });

    it('strips trailing slash from domain', () => {
      const url = buildFullCanonicalUrl('example.com/', '/page');
      assert.strictEqual(url, 'https://example.com/page');
    });
  });

  describe('areParamsEquivalent', () => {
    it('detects equivalent params', () => {
      assert.strictEqual(areParamsEquivalent({ a: 1, b: 2 }, { a: 1, b: 2 }), true);
    });

    it('detects different params', () => {
      assert.strictEqual(areParamsEquivalent({ a: 1 }, { a: 2 }), false);
    });
  });
});
