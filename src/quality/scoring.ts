import type { QualityScore, QualityConfig } from '../types.js';

export const DEFAULT_QUALITY_CONFIG: QualityConfig = {
  scoreThreshold: 70,
  requireUniqueTitle: true,
  requireMetaDescription: true,
  minContentWords: 100,
  requireExamples: true,
  requireInternalLinks: true,
  requireCanonicalUrl: true,
  requireStructuredData: false,
  requireImageAlt: false,
  aiContentFlagging: true,
  autoBlock: false,
};

export interface QualityInput {
  title?: string;
  metaDescription?: string;
  contentWords?: number;
  contentText?: string;
  readabilityScore?: number;
  originalityScore?: number;
  internalLinks: number;
  inboundLinks: number;
  hasStructuredData: boolean;
  hasCanonicalUrl: boolean;
  hasOpenGraph: boolean;
  hasExamples: boolean;
  hasHeadings: boolean;
  hasImageAlt: boolean;
  imageCount: number;
  imageWithAltCount: number;
  performanceScore?: number;
  isAiGenerated?: boolean;
  hasCitations?: boolean;
  hasFactualGrounding?: boolean;
}

export function computeQualityScore(
  input: QualityInput,
  config: QualityConfig = DEFAULT_QUALITY_CONFIG
): QualityScore {
  let title = 0;
  let description = 0;
  let contentDepth = 0;
  let readability = 0;
  let originality = 0;
  let internalLinking = 0;
  let accessibility = 0;
  let schemaCoverage = 0;
  let imageMetadata = 0;
  let performanceSignals = 0;

  const reasons: string[] = [];

  // Title (0-20)
  if (!input.title || input.title.length < 10) {
    reasons.push('Title too short or missing (min 10 chars)');
  } else {
    title += input.title.length >= 30 && input.title.length <= 70 ? 20 : 10;
  }

  // Description (0-15)
  if (!input.metaDescription || input.metaDescription.length < 50) {
    reasons.push('Meta description too short or missing (min 50 chars)');
  } else {
    description += input.metaDescription.length >= 120 && input.metaDescription.length <= 160 ? 15 : 8;
  }

  // Content depth (0-25)
  const wordCount = input.contentWords || 0;
  if (wordCount < config.minContentWords!) {
    reasons.push(`Content too short (${wordCount} words, need ${config.minContentWords}+)`);
  } else {
    contentDepth += 10;
    if (wordCount >= 300) contentDepth += 5;
    if (wordCount >= 1000) contentDepth += 5;
    if (wordCount >= 2000) contentDepth += 5;
  }

  // Readability (0-10)
  if (input.readabilityScore !== undefined) {
    // Flesch reading ease: 60+ is good
    readability += input.readabilityScore >= 60 ? 10 : input.readabilityScore >= 40 ? 5 : 2;
  }

  // Originality (0-15)
  if (input.originalityScore !== undefined) {
    originality += Math.round(input.originalityScore * 15);
  } else {
    originality += input.contentWords && input.contentWords > 100 ? 8 : 0;
  }

  // Internal linking (0-15)
  if (input.internalLinks === 0 && config.requireInternalLinks) {
    reasons.push('No internal links');
  } else {
    internalLinking += input.internalLinks >= 5 ? 15 : input.internalLinks >= 2 ? 10 : input.internalLinks >= 1 ? 5 : 0;
  }

  // Accessibility checks
  if (!input.hasHeadings) {
    reasons.push('No headings found');
  } else {
    accessibility += 2;
  }

  // Schema coverage (0-10)
  if (input.hasStructuredData) schemaCoverage += 5;
  if (input.hasCanonicalUrl) schemaCoverage += 3;
  if (input.hasOpenGraph) schemaCoverage += 2;

  // Image metadata (0-5)
  if (input.imageCount > 0 && input.imageWithAltCount > 0) {
    const altRatio = input.imageWithAltCount / input.imageCount;
    imageMetadata += Math.round(altRatio * 5);
  } else {
    if (input.imageCount === 0) imageMetadata += 5; // no images needed
  }

  // Performance signals (0-5)
  if (input.performanceScore !== undefined) {
    performanceSignals += Math.round((input.performanceScore / 100) * 5);
  }

  // AI content checks
  if (input.isAiGenerated && config.aiContentFlagging) {
    if (!input.hasCitations) {
      reasons.push('AI-generated content lacks citations');
    }
    if (!input.hasFactualGrounding) {
      reasons.push('AI-generated content lacks factual grounding');
    }
  }

  if (!input.hasExamples && config.requireExamples) {
    reasons.push('No examples found');
  }

  const total = title + description + contentDepth + readability + originality +
    internalLinking + accessibility + schemaCoverage + imageMetadata + performanceSignals;

  const verdict = determineVerdict(total, reasons, config);

  return {
    total: Math.min(total, 100),
    dimensions: {
      title,
      description,
      contentDepth,
      readability,
      originality,
      internalLinking,
      accessibility,
      schemaCoverage,
      imageMetadata,
      performanceSignals,
    },
    verdict,
    reasons,
  };
}

function determineVerdict(
  score: number,
  reasons: string[],
  config: QualityConfig
): QualityScore['verdict'] {
  const threshold = config.scoreThreshold || 70;

  if (score >= threshold && reasons.length === 0) return 'index';
  if (score < threshold && reasons.length > 5) return 'blocked';
  if (score < threshold) return 'noindex';
  if (reasons.length > 0) return 'review_required';

  return 'index';
}

export interface QualityReport {
  url: string;
  score: QualityScore;
  passed: boolean;
}

export function generateQualityReport(
  results: QualityReport[]
): string {
  const lines: string[] = ['=== Quality Scoring Report ===', ''];

  const passed = results.filter((r) => r.passed);
  const failed = results.filter((r) => !r.passed);

  lines.push(`Summary: ${passed.length} passed, ${failed.length} failed out of ${results.length}`);
  lines.push('');

  if (failed.length > 0) {
    lines.push('Failed Pages:');
    for (const result of failed) {
      lines.push(`  ${result.url} (score: ${result.score.total})`);
      for (const reason of result.score.reasons) {
        lines.push(`    - ${reason}`);
      }
    }
    lines.push('');
  }

  lines.push('Index Distribution:');
  const byVerdict = new Map<string, number>();
  for (const result of results) {
    const v = result.score.verdict;
    byVerdict.set(v, (byVerdict.get(v) || 0) + 1);
  }
  for (const [verdict, count] of byVerdict) {
    lines.push(`  ${verdict}: ${count}`);
  }

  return lines.join('\n');
}
