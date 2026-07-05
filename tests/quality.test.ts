import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { computeQualityScore } from '../src/quality/scoring.js';
import { indexingGate } from '../src/quality/gates.js';
import { analyzeContent, detectAiContent } from '../src/quality/detectors.js';

describe('quality', () => {
  describe('computeQualityScore', () => {
    it('returns high score for complete content', () => {
      const score = computeQualityScore({
        title: 'A Complete and Well Written Article Title',
        metaDescription: 'This is a comprehensive meta description that fully describes the page content and is long enough to pass validation checks.',
        contentWords: 500,
        internalLinks: 5,
        inboundLinks: 3,
        hasStructuredData: true,
        hasCanonicalUrl: true,
        hasOpenGraph: true,
        hasExamples: true,
        hasHeadings: true,
        hasImageAlt: true,
        imageCount: 3,
        imageWithAltCount: 3,
      });
      assert.ok(score.total >= 70);
      assert.strictEqual(score.verdict, 'index');
    });

    it('returns low score for thin content', () => {
      const score = computeQualityScore({
        title: 'Hi',
        metaDescription: 'Short',
        contentWords: 20,
        internalLinks: 0,
        inboundLinks: 0,
        hasStructuredData: false,
        hasCanonicalUrl: false,
        hasOpenGraph: false,
        hasExamples: false,
        hasHeadings: false,
        hasImageAlt: false,
        imageCount: 0,
        imageWithAltCount: 0,
      });
      assert.ok(score.total < 70);
      assert.strictEqual(score.verdict, 'blocked');
      assert.ok(score.reasons.length > 0);
    });

    it('penalizes lack of internal links', () => {
      const score = computeQualityScore({
        title: 'Good Article Title Here',
        metaDescription: 'A proper description for this article that has enough length to pass validation.',
        contentWords: 500,
        internalLinks: 0,
        inboundLinks: 0,
        hasStructuredData: true,
        hasCanonicalUrl: true,
        hasOpenGraph: true,
        hasExamples: true,
        hasHeadings: true,
        hasImageAlt: true,
        imageCount: 0,
        imageWithAltCount: 0,
      });
      assert.ok(score.reasons.some((r) => r.includes('internal links')));
    });
  });

  describe('indexingGate', () => {
    it('allows high-quality content', () => {
      const result = indexingGate({
        title: 'A Complete and Well Written Article Title',
        metaDescription: 'This is a comprehensive meta description that fully describes the page content and is long enough to pass validation checks.',
        contentWords: 500,
        internalLinks: 5,
        inboundLinks: 3,
        hasStructuredData: true,
        hasCanonicalUrl: true,
        hasOpenGraph: true,
        hasExamples: true,
        hasHeadings: true,
        hasImageAlt: true,
        imageCount: 3,
        imageWithAltCount: 3,
      });
      assert.strictEqual(result.allowed, true);
      assert.strictEqual(result.directive, 'index, follow');
    });

    it('blocks thin content', () => {
      const result = indexingGate({
        title: 'Hi',
        metaDescription: 'Short',
        contentWords: 10,
        internalLinks: 0,
        inboundLinks: 0,
        hasStructuredData: false,
        hasCanonicalUrl: false,
        hasOpenGraph: false,
        hasExamples: false,
        hasHeadings: false,
        hasImageAlt: false,
        imageCount: 0,
        imageWithAltCount: 0,
      });
      assert.strictEqual(result.allowed, false);
      assert.ok(result.directive.includes('noindex'));
    });
  });

  describe('detectAiContent', () => {
    it('detects obvious AI-generated text', () => {
      const result = detectAiContent(
        'As an AI language model, I cannot provide real-time data. However, it is important to note that ultimately, this is a complex topic. In conclusion, please note that things change.'
      );
      assert.strictEqual(result.isAiGenerated, true);
      assert.ok(result.confidence >= 25);
    });

    it('passes normal human text', () => {
      const result = detectAiContent(
        'I built this feature last week. The API was tricky, but after reading the docs I got it working. Let me show you the code.'
      );
      assert.strictEqual(result.isAiGenerated, false);
    });

    it('detects citations', () => {
      const result = detectAiContent(
        'According to Smith (2024), the methodology is effective. Research by the team showed similar results. For more details see https://example.com/paper.'
      );
      assert.strictEqual(result.hasCitations, true);
      assert.strictEqual(result.hasFactualGrounding, true);
    });
  });

  describe('analyzeContent', () => {
    it('counts words and detects structure', () => {
      const analysis = analyzeContent(
        '# Introduction\n\nThis is a simple paragraph with some content.\n\n## Examples\n\n```js\nconsole.log("hello");\n```\n\n- Item 1\n- Item 2\n\n[Link](/docs)'
      );
      assert.ok(analysis.wordCount > 5);
      assert.strictEqual(analysis.hasHeadings, true);
      assert.strictEqual(analysis.hasExamples, true);
      assert.strictEqual(analysis.hasCodeBlocks, true);
      assert.strictEqual(analysis.hasLists, true);
      assert.ok(analysis.internalLinkCount > 0);
    });
  });
});
