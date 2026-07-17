import type { RobotsConfig, RobotsPattern, ResolvedRobotsConfig } from '../types.js';
import { isCrawlTrap } from './canonical-url.js';

const DEFAULT_ROBOTS_PATTERNS: RobotsPattern[] = [
  { pattern: '/api/*', directive: 'noindex,nofollow', sitemapInclude: false },
  { pattern: '/admin/*', directive: 'noindex,nofollow', sitemapInclude: false },
  { pattern: '/dashboard/*', directive: 'noindex,nofollow', sitemapInclude: false },
  { pattern: '/search*', directive: 'noindex,follow', sitemapInclude: false },
  { pattern: '/preview/*', directive: 'noindex,nofollow', sitemapInclude: false },
  { pattern: '/workspace/*', directive: 'noindex,nofollow', sitemapInclude: false },
  { pattern: '/auth/*', directive: 'noindex,nofollow', sitemapInclude: false },
  { pattern: '/callback*', directive: 'noindex,nofollow', sitemapInclude: false },
  { pattern: '/*?*sort=*', directive: 'noindex,follow', sitemapInclude: false },
  { pattern: '/*?*page=*', directive: 'index,follow', sitemapInclude: false },
  { pattern: '/*?*view=*', directive: 'noindex,follow', sitemapInclude: false },
  { pattern: '/*?*theme=*', directive: 'noindex,follow', sitemapInclude: false },
  { pattern: '/*?*layout=*', directive: 'noindex,follow', sitemapInclude: false },
  { pattern: '/embed/*', directive: 'noindex,follow', sitemapInclude: false },
];

const ENV_DEFAULT_DIRECTIVE: Record<string, string> = {
  production: 'index,follow',
  staging: 'noindex,nofollow',
  preview: 'noindex,nofollow',
  test: 'noindex,nofollow',
  development: 'noindex,nofollow',
};

export function resolveRobotsConfig(
  config?: RobotsConfig,
  environment: string = 'production'
): ResolvedRobotsConfig {
  const defaultDisallows = [
    '/api/*',
    '/search*',
    '/*?sort=*',
    '/*?view=*',
    '/*?theme=*',
    '/embed/*',
    '/preview/*',
    '/admin/*',
    '/dashboard/*',
    '/auth/*',
    '/callback*',
  ];

  const resolved: ResolvedRobotsConfig = {
    defaultDirective: ENV_DEFAULT_DIRECTIVE[environment] || 'index,follow',
    crawlDelay: config?.crawlDelay ?? 1,
    disallowPaths: [...defaultDisallows, ...(config?.disallowPaths || [])],
    allowPaths: config?.allowPaths || [],
  };

  if (config?.environmentOverride?.[environment]) {
    Object.assign(resolved, config.environmentOverride[environment]);
  }

  return resolved;
}

export function matchRobotsDirective(
  path: string,
  patterns: RobotsPattern[],
  defaultDirective: string = 'index,follow'
): { directive: string; shouldIncludeInSitemap: boolean } {
  for (const entry of patterns) {
    const regex = globToRegex(entry.pattern);
    if (regex.test(path)) {
      return {
        directive: entry.directive,
        shouldIncludeInSitemap: entry.sitemapInclude !== false,
      };
    }
  }

  return {
    directive: defaultDirective,
    shouldIncludeInSitemap: true,
  };
}

function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp('^' + escaped + '$', 'i');
}

export function computeRobotsDirective(quality: {
  isIndexable: boolean;
  hasUniqueContent: boolean;
  qualityScore: number;
  isDuplicate: boolean;
}): string {
  if (quality.isDuplicate) return 'noindex,follow';
  if (!quality.isIndexable) return 'noindex,follow';
  if (!quality.hasUniqueContent) return 'noindex,follow';
  if (quality.qualityScore < 50) return 'noindex,follow';
  return 'index,follow';
}

export function generateRobotsTxt(
  baseUrl: string,
  config: ResolvedRobotsConfig
): string {
  const lines: string[] = ['User-agent: *'];

  for (const path of config.disallowPaths) {
    lines.push(`Disallow: ${path}`);
  }

  for (const path of config.allowPaths) {
    lines.push(`Allow: ${path}`);
  }

  if (config.crawlDelay) {
    lines.push(`Crawl-delay: ${config.crawlDelay}`);
  }

  lines.push('');
  lines.push(`Sitemap: ${baseUrl.replace(/\/$/, '')}/sitemap.xml`);



  return lines.join('\n');
}

export { isCrawlTrap };
