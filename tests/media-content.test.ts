import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { auditAiContent, remarkSeoPreset } from '../src/content/index.js';
import {
  buildResponsiveImageSources,
  optimizeSeoImage,
  validateMediaSeo,
  type SharpPipelineLike,
} from '../src/media/index.js';

class FakeSharp implements SharpPipelineLike {
  operations: string[] = [];
  clone() { const next = new FakeSharp(); next.operations = [...this.operations]; return next; }
  resize(options: { width: number; height?: number }) {
    this.operations.push('resize:' + options.width + 'x' + (options.height ?? 'auto'));
    return this;
  }
  avif() { this.operations.push('avif'); return this; }
  webp() { this.operations.push('webp'); return this; }
  jpeg() { this.operations.push('jpeg'); return this; }
  async toBuffer() { return new Uint8Array([1, 2, 3]); }
}

describe('SEO media pipeline', () => {
  it('creates responsive and social media variants', async () => {
    const variants = await optimizeSeoImage(new FakeSharp(), {
      widths: [320, 640],
      formats: ['avif', 'webp', 'jpeg'],
      originalWidth: 1000,
      originalHeight: 500,
      includeSocialCard: true,
    });
    assert.equal(variants.length, 8);
    assert.deepEqual(variants.find((variant) => variant.width === 320)?.height, 160);
    assert.ok(variants.some((variant) => variant.suffix === '-social-1200x630.webp'));

    const sources = buildResponsiveImageSources('/media/hero', variants);
    assert.match(sources.find((source) => source.type === 'image/avif')?.srcset ?? '', /320w/);
  });

  it('validates dimensions, alt text, and licensing URLs', () => {
    assert.deepEqual(validateMediaSeo({}), [
      'Explicit media dimensions are required',
      'Descriptive alternative text is required',
    ]);
    assert.deepEqual(validateMediaSeo({
      width: 1200,
      height: 630,
      alt: 'Relationship graph for the investigation',
      licenseUrl: 'https://example.com/license',
    }), []);
  });
});

describe('AI content publication gate', () => {
  it('blocks unreviewed and uncited generated content', () => {
    const result = auditAiContent({
      title: 'Generated intelligence briefing',
      description: 'A generated briefing for analysts.',
      canonicalUrl: 'https://example.com/briefings/today',
      markdown: '# Briefing\n\n![Map](/map.png)\n\n## Findings\n\nShort content.',
      author: 'Noir Stack',
      generatedWithAi: true,
      minimumWords: 1,
    });
    assert.equal(result.publicationReady, false);
    assert.ok(result.issues.some((issue) => issue.code === 'human-review-missing'));
    assert.ok(result.issues.some((issue) => issue.code === 'citations-missing'));
  });

  it('accepts reviewed, cited, accessible content', () => {
    const result = auditAiContent({
      title: 'Reviewed intelligence briefing',
      description: 'A reviewed briefing with source citations and accessible media.',
      canonicalUrl: 'https://example.com/briefings/reviewed',
      markdown: '# Briefing\n\n![Maritime route map](/map.png)\n\n## Findings\n\nReviewed finding.',
      author: 'Noir Stack',
      reviewedBy: 'Editorial review desk',
      generatedWithAi: true,
      citations: ['https://example.com/source'],
      transcriptRequired: true,
      transcript: 'Accessible transcript.',
      minimumWords: 1,
    });
    assert.equal(result.publicationReady, true);
    assert.ok(remarkSeoPreset.plugins.includes('remark-lint-heading-increment'));
  });
});
