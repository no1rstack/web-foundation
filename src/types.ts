export interface WebFoundationConfig {
  app: AppConfig;
  seo?: SeoConfig;
  security?: SecurityConfig;
  robots?: RobotsConfig;
  rateLimit?: RateLimitConfig;
  ipTracking?: IpTrackingConfig;
  logging?: LoggingConfig;
  caching?: CachingConfig;
  quality?: QualityConfig;
  environment?: 'development' | 'test' | 'preview' | 'staging' | 'production';
}

export interface AppConfig {
  name: string;
  slug: string;
  baseUrl: string;
  brandName: string;
  defaultTitle: string;
  defaultDescription: string;
  logo?: string;
  themeColor?: string;
  supportedLocales?: string[];
}

export interface SeoConfig {
  sitemapGroups?: SitemapGroup[];
  metadataTemplates?: MetadataTemplates;
  canonicalRules?: CanonicalRules;
  robotsPatterns?: RobotsPattern[];
  structuredDataPresets?: StructuredDataPreset[];
}

export interface SitemapGroup {
  name: string;
  path: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  maxEntries?: number;
  includeInIndex?: boolean;
}

export interface MetadataTemplates {
  title?: string;
  description?: string;
  titleSeparator?: string;
  titleSuffix?: string;
}

export interface CanonicalRules {
  trailingSlash?: 'keep' | 'remove' | 'add';
  stripTrackingParams?: boolean;
  trackingParams?: string[];
  caseInsensitive?: boolean;
  lowercasePath?: boolean;
}

export interface RobotsPattern {
  pattern: string;
  directive: 'index,follow' | 'noindex,follow' | 'index,nofollow' | 'noindex,nofollow';
  sitemapInclude?: boolean;
}

export interface StructuredDataPreset {
  type: string;
  schema: 'Organization' | 'WebSite' | 'Product' | 'SoftwareApplication' | 'Article' | 'BlogPosting' | 'FAQ' | 'HowTo' | 'Course' | 'Documentation' | 'BreadcrumbList';
  defaults: Record<string, unknown>;
}

export interface SecurityConfig {
  contentSecurityPolicy?: string | false;
  frameOptions?: 'DENY' | 'SAMEORIGIN' | false;
  referrerPolicy?: string;
  permissionsPolicy?: string;
  hsts?: { maxAge: number; includeSubDomains?: boolean; preload?: boolean } | false;
  contentTypeOptions?: 'nosniff' | false;
  xssProtection?: false;
  environmentRelaxations?: Partial<Record<string, Partial<SecurityConfig>>>;
}

export interface RobotsConfig {
  defaultDirective?: 'index,follow' | 'noindex,follow' | 'index,nofollow' | 'noindex,nofollow';
  environmentOverride?: Partial<Record<string, Partial<RobotsOverride>>>;
  crawlDelay?: number;
  disallowPaths?: string[];
  allowPaths?: string[];
}

export interface ResolvedRobotsConfig {
  defaultDirective: string;
  crawlDelay: number;
  disallowPaths: string[];
  allowPaths: string[];
}

export interface RobotsOverride {
  defaultDirective: 'noindex,nofollow';
}

export interface RateLimitRule {
  path: string | RegExp;
  method?: string | string[];
  windowMs: number;
  max: number;
  keyType: 'ip' | 'user' | 'bot';
  action: 'allow' | 'challenge' | 'throttle' | 'block';
}

export interface RateLimitConfig {
  enabled?: boolean;
  globalWindowMs?: number;
  globalMax?: number;
  rules?: RateLimitRule[];
  store?: 'memory' | 'redis';
  redisUrl?: string;
}

export interface IpTrackingConfig {
  enabled?: boolean;
  hashSalt?: string;
  storeRawIp?: boolean;
  geoLookup?: boolean;
  asnDetection?: boolean;
  vpnDetection?: boolean;
  botScoring?: boolean;
  /** Trust X-Forwarded-For only when Express is behind a configured trusted proxy. */
  trustProxyHeaders?: boolean;
  regionalAllowDeny?: {
    allow?: string[];
    deny?: string[];
  };
}

export interface LoggingConfig {
  level?: 'debug' | 'info' | 'warn' | 'error';
  requestLogging?: boolean;
  traceHeaders?: boolean;
  auditLogging?: boolean;
  redactHeaders?: string[];
  skipPaths?: string[];
}

export interface CachingConfig {
  defaultCacheControl?: string;
  staticAssetPolicy?: Record<string, string>;
  routeSpecific?: Record<string, string>;
  cdn?: boolean;
  staleWhileRevalidate?: number;
}

export interface QualityConfig {
  scoreThreshold?: number;
  requireUniqueTitle?: boolean;
  requireMetaDescription?: boolean;
  minContentWords?: number;
  requireExamples?: boolean;
  requireInternalLinks?: boolean;
  requireCanonicalUrl?: boolean;
  requireStructuredData?: boolean;
  requireImageAlt?: boolean;
  aiContentFlagging?: boolean;
  autoBlock?: boolean;
}

export interface RequestMetadata {
  ip?: string;
  ipHash?: string;
  geo?: GeoResult;
  botScore?: number;
  userAgent?: string;
  referer?: string;
}

export interface GeoResult {
  country?: string;
  region?: string;
  city?: string;
  lat?: number;
  lon?: number;
  asn?: string;
  org?: string;
}

export interface NormalizedParams {
  [key: string]: unknown;
}

export interface ParamSchema {
  key: string;
  type: 'int' | 'float' | 'bool' | 'string' | 'select' | 'multiselect';
  default_value?: string;
  required?: boolean;
  is_indexable?: boolean;
}

export interface CanonicalResult {
  canonicalKey: string;
  canonicalPath: string;
  normalized: NormalizedParams;
  shouldRedirect: boolean;
  redirectTarget?: string;
}

export interface QualityScore {
  total: number;
  dimensions: {
    title: number;
    description: number;
    contentDepth: number;
    readability: number;
    originality: number;
    internalLinking: number;
    accessibility: number;
    schemaCoverage: number;
    imageMetadata: number;
    performanceSignals: number;
  };
  verdict: 'index' | 'noindex' | 'review_required' | 'blocked';
  reasons: string[];
}

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

export interface SitemapSource {
  name: string;
  entries: SitemapEntry[] | (() => Promise<SitemapEntry[]>);
  includeInIndex?: boolean;
}

export interface StructuredDataPayload {
  '@context': 'https://schema.org';
  '@type': string;
  [key: string]: unknown;
}

export interface OpenGraphData {
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogUrl: string;
  ogType: string;
  ogSiteName?: string;
  ogLocale?: string;
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  twitterSite?: string;
  twitterCreator?: string;
  twitterImage?: string;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface LinkAnalysisReport {
  orphanPages: string[];
  brokenLinks: { from: string; to: string; status: number }[];
  missingMetadata: { url: string; missing: string[] }[];
  duplicateMetadata: { url: string; type: string; duplicateOf: string }[];
  sitemapMismatches: { url: string; issue: string }[];
  recommendations: { from: string; to: string; reason: string }[];
}
