import type { QualityConfig } from '../types.js';
import { computeQualityScore, DEFAULT_QUALITY_CONFIG, type QualityInput } from './scoring.js';

export interface GateResult {
  allowed: boolean;
  directive: string;
  reason?: string;
  score?: number;
}

export function indexingGate(
  input: QualityInput,
  config: QualityConfig = DEFAULT_QUALITY_CONFIG
): GateResult {
  const score = computeQualityScore(input, config);

  if (score.verdict === 'blocked') {
    return {
      allowed: false,
      directive: 'noindex, nofollow',
      reason: `Auto-blocked: score ${score.total} with ${score.reasons.length} issues`,
      score: score.total,
    };
  }

  if (score.verdict === 'noindex' || score.verdict === 'review_required') {
    if (config.autoBlock) {
      return {
        allowed: false,
        directive: 'noindex, follow',
        reason: `Auto-blocked: score ${score.total} below threshold ${config.scoreThreshold}`,
        score: score.total,
      };
    }

    return {
      allowed: false,
      directive: 'noindex, follow',
      reason: score.reasons.join('; '),
      score: score.total,
    };
  }

  return {
    allowed: true,
    directive: 'index, follow',
    score: score.total,
  };
}

export function isIndexable(score: number, config: QualityConfig = DEFAULT_QUALITY_CONFIG): boolean {
  const threshold = config.scoreThreshold || 70;
  return score >= threshold;
}

export function shouldBlockFromSitemap(
  input: QualityInput,
  config: QualityConfig = DEFAULT_QUALITY_CONFIG
): boolean {
  const score = computeQualityScore(input, config);
  return score.verdict === 'blocked' || score.verdict === 'noindex';
}

export function needsReview(
  input: QualityInput,
  config: QualityConfig = DEFAULT_QUALITY_CONFIG
): boolean {
  const score = computeQualityScore(input, config);
  return score.verdict === 'review_required';
}
