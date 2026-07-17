# @noirstack/web-foundation

Shared web foundation for NoirStack apps — SEO, security headers, robots, canonical URLs, structured data, content quality scoring, and Express middleware.

## Install

```bash
npm install @noirstack/web-foundation
```

## Quick start (Express)

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
});

const app = express();
app.set('trust proxy', true);

const wf = createExpressMiddleware({ config });
app.use(wf.crawlTrapBlocker());
app.use(wf.ipTracking());
app.use(wf.canonicalRedirect());
app.get('/robots.txt', wf.robotsTxt());
app.get('/health', wf.healthCheck());
```

## Subpath exports

| Import | Purpose |
|--------|---------|
| `@noirstack/web-foundation` | Config, types, middleware primitives |
| `@noirstack/web-foundation/express` | Express adapter |
| `@noirstack/web-foundation/seo` | Sitemap, metadata, structured data |
| `@noirstack/web-foundation/quality` | Content scoring and gates |

## License

MIT
