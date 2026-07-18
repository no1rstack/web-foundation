import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  auditRenderedPage,
  axeSeoPreset,
  createLighthousePreset,
  createLinkinatorPreset,
  htmlValidateSeoPreset,
  recommendedSeoTooling,
} from '../src/audit/index.js';

describe('SEO audit toolkit', () => {
  it('creates hardened Lighthouse assertions', () => {
    const preset = createLighthousePreset();
    const assertions = preset.ci.assert.assertions;
    assert.deepEqual(assertions['categories:seo'], ['error', { minScore: 0.95 }]);
    assert.deepEqual(assertions.canonical, ['error', { minScore: 1 }]);
    assert.deepEqual(assertions['largest-contentful-paint'], ['warn', { maxNumericValue: 2500 }]);
  });

  it('creates recursive link crawler defaults', () => {
    const preset = createLinkinatorPreset({ serverRoot: 'https://example.com' });
    assert.equal(preset.recurse, true);
    assert.equal(preset.serverRoot, 'https://example.com');
    assert.ok(preset.linksToSkip.includes('^mailto:'));
  });

  it('ships accessibility and semantic HTML rules', () => {
    assert.equal(axeSeoPreset.rules['page-has-heading-one'].enabled, true);
    assert.equal(htmlValidateSeoPreset.rules['heading-level'], 'error');
  });

  it('finds crawlability, metadata, semantic, media, and hydration failures', () => {
    const findings = auditRenderedPage({
      url: 'https://example.com/platform',
      status: 200,
      title: '',
      canonicalUrls: [],
      robots: 'noindex',
      h1: ['One', 'Two'],
      jsonLd: [],
      links: [{ href: '', text: '' }],
      images: [{ src: '/hero.jpg' }],
      consoleErrors: ['Uncaught application error'],
      hydrationErrors: ['Hydration mismatch'],
    }, { requireSocialImage: true });

    const codes = findings.map((finding) => finding.code);
    for (const code of [
      'title-missing',
      'description-missing',
      'canonical-count',
      'unexpected-noindex',
      'h1-count',
      'language-missing',
      'jsonld-missing',
      'open-graph-incomplete',
      'twitter-incomplete',
      'image-alt',
      'image-dimensions',
      'link-href',
      'console-error',
      'hydration-error',
    ]) assert.ok(codes.includes(code), `missing finding: ${code}`);
  });

  it('keeps external tooling pinned to reviewed major versions', () => {
    assert.match(recommendedSeoTooling.lighthouseCi, /^0\.15\./);
    assert.match(recommendedSeoTooling.puppeteer, /^25\./);
  });
});
