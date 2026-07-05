import type { WebFoundationConfig } from '../types.js';

export const DEFAULT_CONFIG: Partial<WebFoundationConfig> = {
  environment: 'production',
  seo: {
    canonicalRules: {
      trailingSlash: 'remove',
      stripTrackingParams: true,
      lowercasePath: true,
    },
  },
  robots: {
    defaultDirective: 'index,follow',
    crawlDelay: 1,
  },
  rateLimit: {
    enabled: true,
    globalWindowMs: 60_000,
    globalMax: 100,
    rules: [],
  },
  ipTracking: {
    enabled: true,
    hashSalt: 'web-foundation-default-salt',
    storeRawIp: false,
    botScoring: true,
  },
  logging: {
    level: 'info',
    requestLogging: true,
    traceHeaders: true,
  },
  quality: {
    scoreThreshold: 70,
    requireUniqueTitle: true,
    requireMetaDescription: true,
    minContentWords: 100,
    requireExamples: true,
    requireInternalLinks: true,
    requireCanonicalUrl: true,
    aiContentFlagging: true,
    autoBlock: false,
  },
};

export function createWebFoundation(config: WebFoundationConfig): WebFoundationConfig {
  return deepMerge({}, DEFAULT_CONFIG, config) as WebFoundationConfig;
}

function deepMerge(target: any, ...sources: any[]): any {
  for (const source of sources) {
    if (!source) continue;
    for (const key of Object.keys(source)) {
      const sourceVal = source[key];
      const targetVal = target[key];

      if (sourceVal && typeof sourceVal === 'object' && !Array.isArray(sourceVal)) {
        target[key] = deepMerge(
          targetVal && typeof targetVal === 'object' ? targetVal : {},
          sourceVal
        );
      } else {
        target[key] = sourceVal;
      }
    }
  }
  return target;
}
