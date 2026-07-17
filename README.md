# @noirstack/web-foundation

Framework-neutral web infrastructure for Noir Stack applications: secure HTTP defaults, canonical URLs, robots and crawl controls, request metadata, rate limiting, health checks, SEO metadata, sitemaps, structured data, and content-quality gates.

## Install

```bash
npm install @noirstack/web-foundation
```

Node.js 20 or newer is required. Express is an optional peer dependency.

## Express quick start

```ts
import express from 'express';
import { createWebFoundation } from '@noirstack/web-foundation';
import { createExpressMiddleware } from '@noirstack/web-foundation/express';

const config = createWebFoundation({
  environment: 'production',
  app: {
    name: 'My App',
    slug: 'my-app',
    baseUrl: 'https://example.com',
    brandName: 'ExampleCo',
    defaultTitle: 'My App',
    defaultDescription: 'Description for search and social previews.',
  },
  ipTracking: {
    enabled: true,
    hashSalt: process.env.IP_HASH_SALT,
    // Enable only after configuring Express trust proxy for your proxy network.
    trustProxyHeaders: false,
  },
  rateLimit: {
    enabled: true,
    globalWindowMs: 60_000,
    globalMax: 100,
  },
});

const app = express();
app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);

const wf = createExpressMiddleware({ config });
wf.applyAll(app);
```

## Security defaults

- Production CSP excludes `unsafe-eval`, blocks plugins with `object-src 'none'`, and restricts base URLs and form submissions.
- `X-Forwarded-For` is ignored unless `ipTracking.trustProxyHeaders` is explicitly enabled.
- Global rate limits apply even when no route-specific rule matches.
- Rate-limit responses include standard `Retry-After` and epoch-based reset headers.
- Raw IP storage is disabled by default.

Customize CSP for required scripts, styles, frames, and connection origins. Use a unique secret `hashSalt`; the fallback is provided only for compatibility. The built-in memory limiter is process-local, so clustered deployments should supply a shared enforcement layer until a store adapter is configured.

## Applying middleware individually

```ts
app.use(wf.securityHeaders());
app.use(wf.crawlTrapBlocker());
app.use(wf.ipTracking());
app.use(wf.rateLimiter());
app.use(wf.requestLogger());
app.use(wf.canonicalRedirect());
app.get('/robots.txt', wf.robotsTxt());
app.get('/health', wf.healthCheck());
```

Apply authentication before rate limiting when a rule uses `keyType: 'user'`.

## Subpath exports

| Import | Purpose |
|---|---|
| `@noirstack/web-foundation` | Configuration, types, middleware primitives |
| `@noirstack/web-foundation/express` | Express adapter |
| `@noirstack/web-foundation/middleware` | Framework-neutral HTTP functions |
| `@noirstack/web-foundation/seo` | Sitemap, metadata, structured data |
| `@noirstack/web-foundation/quality` | Content scoring and publication gates |

## Development

```bash
npm ci
npm run check
npm pack --dry-run
```

CI verifies Node 20 and Node 22. See [SECURITY.md](SECURITY.md) for vulnerability reporting and deployment responsibilities.

## License

MIT
