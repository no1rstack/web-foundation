import type { SitemapEntry, SitemapSource, WebFoundationConfig } from '../../types.js';
import type { PageMetadata } from '../../seo/metadata.js';
import { resolveSecurityConfig } from '../../middleware/security-headers.js';
import { resolveRobotsConfig, generateRobotsTxt } from '../../middleware/robots.js';
import { resolveRateLimitConfig } from '../../middleware/rate-limiter.js';
import { log, logRequest, generateTraceId, shouldLogPath } from '../../middleware/request-logger.js';
import { applySecurityHeaders } from '../../middleware/security-headers.js';
import { isCrawlTrap } from '../../middleware/robots.js';
import { extractClientIp, shouldSkipIpTracking, createRequestMetadata } from '../../middleware/ip-tracking.js';
import { matchRateLimitRule, getRateLimitKey, checkRateLimit } from '../../middleware/rate-limiter.js';
import { globalHealthChecker } from '../../middleware/health-check.js';
import { normalizeUrl } from '../../middleware/canonical-url.js';
import { buildSitemapIndexFromSources, generateSitemapXml, prepareSitemapEntries } from '../../seo/sitemap.js';
import { renderHtmlDocument } from '../../rendering/document.js';

export interface ExpressMiddlewareOptions {
  config: WebFoundationConfig;
  sitemapSources?: SitemapSource[];
  onRequestLog?: (data: {
    method: string;
    path: string;
    queryString?: string;
    statusCode: number;
    responseTimeMs: number;
    ipHash?: string;
    botScore?: number;
    traceId?: string;
  }) => void | Promise<void>;
}

export function createExpressMiddleware(opts: ExpressMiddlewareOptions) {
  const { config, onRequestLog, sitemapSources = [] } = opts;
  const environment = config.environment || 'production';
  const securityConfig = resolveSecurityConfig(config.security, environment);
  const robotsConfig = resolveRobotsConfig(config.robots, environment);
  const rateLimitConfig = resolveRateLimitConfig(config.rateLimit);
  let proxyWarningEmitted = false;

  return {
    securityHeaders() {
      return (req: any, res: any, next: any) => {
        applySecurityHeaders(res, securityConfig);
        next();
      };
    },

    crawlTrapBlocker() {
      return (req: any, res: any, next: any) => {
        if (isCrawlTrap(req.url)) {
          return res.status(404).send('Not Found');
        }
        next();
      };
    },

    ipTracking() {
      const ipConfig = config.ipTracking || {};
      if (!ipConfig.enabled) {
        return (req: any, _res: any, next: any) => {
          req.requestMetadata = {};
          next();
        };
      }

      return (req: any, _res: any, next: any) => {
        if (!ipConfig.trustProxyHeaders && req.headers['x-forwarded-for'] && !proxyWarningEmitted) {
          proxyWarningEmitted = true;
          log('warn', 'Ignoring X-Forwarded-For because ipTracking.trustProxyHeaders is not enabled', {
            path: req.path,
            recommendation: 'Configure Express trust proxy and enable trustProxyHeaders only for known proxy networks',
          });
        }
        if (shouldSkipIpTracking(req.path)) {
          req.requestMetadata = {};
          return next();
        }

        const ip = extractClientIp(req.headers, req.socket?.remoteAddress, { trustProxyHeaders: ipConfig.trustProxyHeaders === true });
        const metadata = createRequestMetadata(
          ip,
          ipConfig,
          req.headers['user-agent'] as string | undefined,
          req.headers.referer as string | undefined
        );

        req.requestMetadata = metadata;
        next();
      };
    },

    rateLimiter() {
      if (!rateLimitConfig.enabled) {
        return (_req: any, _res: any, next: any) => next();
      }

      return async (req: any, res: any, next: any) => {
        const ip = req.requestMetadata?.ip || extractClientIp(req.headers, req.socket?.remoteAddress, { trustProxyHeaders: config.ipTracking?.trustProxyHeaders === true });
        const userId = req.user?.sub || req.user?.id || null;

        const routeRule = matchRateLimitRule(req.path, req.method, rateLimitConfig.rules || []);
        const rule = routeRule || {
          path: '*',
          windowMs: rateLimitConfig.globalWindowMs || 60_000,
          max: rateLimitConfig.globalMax || 100,
          keyType: 'ip' as const,
          action: 'block' as const,
        };

        if (rule) {
          const key = getRateLimitKey(rule, ip, userId);
          const result = await checkRateLimit(rule, key);

          res.setHeader('X-RateLimit-Limit', rule.max);
          res.setHeader('X-RateLimit-Remaining', result.remaining);
          res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000));
          if (result.retryAfter) res.setHeader('Retry-After', result.retryAfter);

          if (!result.allowed) {
            if (rule.action === 'block') {
              return res.status(429).json({ error: 'Too many requests' });
            }
            if (rule.action === 'challenge') {
              return res.status(429).json({
                error: 'Rate limited - complete challenge',
                retryAfter: result.retryAfter,
              });
            }
            if (rule.action === 'throttle') {
              await new Promise((resolve) =>
                setTimeout(resolve, Math.min((result.retryAfter || 1) * 1000, 5000))
              );
            }
          }
        }

        next();
      };
    },

    requestLogger() {
      return (req: any, res: any, next: any) => {
        if (!config.logging?.requestLogging) return next();
        if (!shouldLogPath(req.path, config.logging)) return next();

        const startedAt = Date.now();
        const traceId = generateTraceId();
        req.traceId = traceId;

        res.on('finish', () => {
          const responseTime = Date.now() - startedAt;
          const queryString = req.originalUrl?.includes('?')
            ? req.originalUrl.split('?')[1]
            : undefined;

          const logData = {
            method: req.method,
            path: req.path,
            queryString,
            statusCode: res.statusCode,
            responseTimeMs: responseTime,
            ipHash: req.requestMetadata?.ipHash,
            botScore: req.requestMetadata?.botScore,
            traceId,
          };

          logRequest(logData, config.logging);

          if (onRequestLog) {
            void onRequestLog(logData);
          }
        });

        next();
      };
    },

    robotsTxt() {
      return (_req: any, res: any) => {
        const txt = generateRobotsTxt(config.app.baseUrl, robotsConfig);
        res.type('text/plain');
        res.send(txt);
      };
    },

    healthCheck() {
      return (_req: any, res: any) => {
        void (async () => {
          const health = await globalHealthChecker.runAll();
          res.status(health.ok ? 200 : 503).json({
            status: health.ok ? 'ok' : 'degraded',
            app: config.app.slug,
            environment,
            services: health.services,
            timestamp: new Date().toISOString(),
          });
        })();
      };
    },

    canonicalRedirect() {
      return (req: any, res: any, next: any) => {
        if (req.method !== 'GET') return next();
        if (req.path.startsWith('/api/')) return next();
        if (/^\/assets\//.test(req.path) || /\.(js|mjs|css|woff2?|png|jpe?g|gif|svg|ico|webp|map)$/i.test(req.path)) {
          return next();
        }

        const { pathname, search } = normalizeUrl(req.url, config.seo?.canonicalRules);

        const newUrl = search ? `${pathname}?${search}` : pathname;
        if (newUrl !== req.url) {
          return res.redirect(301, newUrl);
        }

        next();
      };
    },


    sitemapXml() {
      return async (_req: any, res: any, next: any) => {
        try {
          if (sitemapSources.length > 1) {
            res.type('application/xml');
            return res.send(buildSitemapIndexFromSources(config.app.baseUrl, sitemapSources));
          }
          const source = sitemapSources[0];
          const entries = source
            ? (typeof source.entries === 'function' ? await source.entries() : source.entries)
            : [];
          res.type('application/xml');
          return res.send(generateSitemapXml(prepareSitemapEntries(entries).slice(0, 50_000)));
        } catch (error) {
          next(error);
        }
      };
    },

    sitemapSource(source: SitemapSource) {
      return async (_req: any, res: any, next: any) => {
        try {
          const entries = typeof source.entries === 'function' ? await source.entries() : source.entries;
          res.type('application/xml');
          return res.send(generateSitemapXml(prepareSitemapEntries(entries).slice(0, 50_000)));
        } catch (error) {
          next(error);
        }
      };
    },

    permanentRedirect(target: string | ((req: any) => string)) {
      return (req: any, res: any) => res.redirect(301, typeof target === 'function' ? target(req) : target);
    },

    notFound(metadata?: PageMetadata) {
      return (_req: any, res: any) => {
        res.status(404);
        if (metadata) return res.type('html').send(renderHtmlDocument({ metadata, bodyHtml: '<main><h1>Not found</h1></main>' }));
        return res.json({ error: 'Not found', status: 404 });
      };
    },

    gone(metadata?: PageMetadata) {
      return (_req: any, res: any) => {
        res.status(410);
        if (metadata) return res.type('html').send(renderHtmlDocument({ metadata, bodyHtml: '<main><h1>Gone</h1></main>' }));
        return res.json({ error: 'Gone', status: 410 });
      };
    },

    errorHandler(options: { exposeErrors?: boolean; metadata?: PageMetadata } = {}) {
      return (error: unknown, _req: any, res: any, _next: any) => {
        const message = options.exposeErrors && error instanceof Error ? error.message : 'Internal server error';
        res.status(500);
        if (options.metadata) {
          return res.type('html').send(renderHtmlDocument({
            metadata: { ...options.metadata, robots: 'noindex,nofollow' },
            bodyHtml: `<main><h1>Internal server error</h1><p>${escapeHtml(message)}</p></main>`,
          }));
        }
        return res.json({ error: message, status: 500 });
      };
    },

    renderPage(resolve: (req: any) => Promise<{ metadata: PageMetadata; bodyHtml: string; status?: number; language?: string; headHtml?: string; scripts?: Array<{ src: string; type?: string; async?: boolean; defer?: boolean }> }> | { metadata: PageMetadata; bodyHtml: string; status?: number; language?: string; headHtml?: string; scripts?: Array<{ src: string; type?: string; async?: boolean; defer?: boolean }> }) {
      return async (req: any, res: any, next: any) => {
        try {
          const page = await resolve(req);
          res.status(page.status || 200).type('html').send(renderHtmlDocument(page));
        } catch (error) {
          next(error);
        }
      };
    },

    applyAll(app: any) {
      app.use(this.securityHeaders());
      app.use(this.crawlTrapBlocker());
      app.use(this.ipTracking());
      app.use(this.rateLimiter());
      app.use(this.requestLogger());
      app.use(this.canonicalRedirect());

      app.get('/robots.txt', this.robotsTxt());
      app.get('/sitemap.xml', this.sitemapXml());
      for (const source of sitemapSources) {
        app.get(`/sitemap-${encodeURIComponent(source.name)}.xml`, this.sitemapSource(source));
      }
      app.get('/health', this.healthCheck());
    },

    config,
    securityConfig,
    robotsConfig,
    rateLimitConfig,
  };
}


function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
