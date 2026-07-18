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
| `@noirstack/web-foundation/performance` | Browser RUM, Core Web Vitals, GA4/GTM, beacon reporters |
| `@noirstack/web-foundation/media` | Sharp-compatible responsive image and social-card optimization |
| `@noirstack/web-foundation/content` | AI-content review, citation, transcript, and Markdown quality gates |
| `@noirstack/web-foundation/audit` | Lighthouse, crawl, accessibility, semantic HTML, and rendered-page audit presets |

## Complete SEO metadata

```ts
import {
  MetadataBuilder,
  renderMetadataTags,
  buildOrganizationSchema,
} from '@noirstack/web-foundation/seo';

const metadata = new MetadataBuilder({
  baseUrl: 'https://example.com',
  brandName: 'Example',
  defaultTitle: 'Example platform',
  defaultDescription: 'Build and operate your data platform.',
  themeColor: '#101416',
}).buildAll({
  title: 'Platform',
  description: 'Operate databases, APIs, identity, and realtime services.',
  path: '/platform',
  locale: 'en_US',
  alternates: [
    { hrefLang: 'en', href: 'https://example.com/platform' },
    { hrefLang: 'x-default', href: 'https://example.com/platform' },
  ],
  structuredData: buildOrganizationSchema({
    name: 'Example',
    url: 'https://example.com',
  }),
});

const headHtml = renderMetadataTags(metadata);
```

The renderer emits title, description, robots, canonical URL, theme color, Open Graph, Twitter Card, hreflang alternates, and escaped JSON-LD. Sitemap preparation validates absolute URLs, removes duplicates, normalizes modification dates, and honors the 50,000 URL protocol limit.

## Route manifest and browser metadata

Define public routes once, then derive canonical paths, navigation, sitemap entries, robots allow paths, breadcrumbs, and page metadata from the same typed source of truth. Aliases resolve directly to the canonical route, including nested paths, which prevents canonical chains and drift between navigation and crawl configuration.

```ts
import {
  applyBrowserMetadata,
  defineRouteManifest,
  MetadataBuilder,
} from '@noirstack/web-foundation/seo';

const routes = defineRouteManifest([
  {
    path: '/docs',
    aliases: ['/documentation'],
    navLabel: 'Documentation',
    title: 'Developer documentation',
    description: 'Read guides, API references, and architecture documentation.',
    schemaType: 'CollectionPage',
    changefreq: 'weekly',
    priority: 0.8,
  },
]);

routes.canonicalPath('/documentation/install'); // /docs/install
routes.navigation();
routes.sitemap('https://example.com');
routes.robotsAllowPaths();
routes.breadcrumbs('/docs', 'https://example.com');

const input = routes.metadata('/documentation');
if (input) {
  const metadata = new MetadataBuilder({
    baseUrl: 'https://example.com',
    brandName: 'Example',
    defaultTitle: 'Example platform',
    defaultDescription: 'Build and operate governed data services.',
  }).buildAll(input);

  applyBrowserMetadata(document, metadata, {
    socialImage: { width: 1200, height: 630, alt: 'Example platform' },
  });
}
```

`applyBrowserMetadata` is framework-neutral and keeps client-routed pages synchronized across the document title, description, robots, canonical URL, theme color, Open Graph, and Twitter Card tags. Server-rendered and static pages should continue using `renderMetadataTags` so crawlers receive the same metadata in the initial HTML.

## Typed Schema.org for AI, media, and data products

The SEO export includes `schema-dts` 2.x types plus focused builders for AI software, generated images, video, audio, datasets, and data catalogs. Consumers get compile-time Schema.org property validation without hand-maintaining a partial vocabulary.

```ts
import {
  buildAiSoftwareApplicationSchema,
  buildDatasetSchema,
  buildVideoObjectSchema,
  defineSchemaGraph,
  renderJsonLd,
} from '@noirstack/web-foundation/seo';

const dataset = buildDatasetSchema({
  name: 'Sanctions entities snapshot',
  description: 'Normalized entities used by the investigation platform.',
  url: 'https://example.com/data/sanctions',
  creator: { name: 'Noir Stack', url: 'https://noirstack.com' },
  license: 'https://example.com/data-license',
  variableMeasured: ['entity name', 'program', 'jurisdiction'],
  distribution: [{
    contentUrl: 'https://example.com/data/sanctions.json',
    encodingFormat: 'application/json',
  }],
});

const application = buildAiSoftwareApplicationSchema({
  name: 'Judicium Explorer',
  description: 'AI-assisted legal and sanctions investigation workspace.',
  url: 'https://judicium.app',
  creator: { name: 'Noir Stack', url: 'https://noirstack.com' },
  featureList: ['Federated search', 'Cited synthesis', 'Entity graph'],
  supportingDatasets: [{
    name: 'Sanctions entities snapshot',
    url: 'https://example.com/data/sanctions',
  }],
});

const video = buildVideoObjectSchema({
  name: 'Investigation briefing',
  description: 'A cited briefing generated from an investigation workspace.',
  contentUrl: 'https://example.com/media/briefing.mp4',
  thumbnailUrl: 'https://example.com/media/briefing.jpg',
  uploadDate: new Date(),
  duration: 'PT4M12S',
  transcript: 'Accessible transcript...',
});

const jsonLd = renderJsonLd(defineSchemaGraph([dataset, application, video]));
```

Media builders support discoverability and provenance fields including creator, caption, transcript, encoding format, dimensions, upload date, credit, copyright notice, and licensing URL. Dataset builders support distributions, measured variables, temporal/spatial coverage, licensing, publication dates, and catalog/application relationships.

## Semantic layer and rich results

The SEO package provides typed Schema.org generators, so applications do not need to hand-author JSON-LD objects. Supported entities include:

- `Organization`, `Corporation`, `LocalBusiness`, and `NGO`
- `Person` and authority links through `sameAs`
- `CreativeWork`, `Article`, `BlogPosting`, and `TechArticle`
- `Product` with offers, availability, and aggregate ratings
- `Event` with dates, attendance mode, location, organizer, performers, and offers
- `SoftwareApplication`, `FAQPage`, `BreadcrumbList`, `HowTo`, and `Course`

```ts
import {
  buildEventSchema,
  buildOrganizationSchema,
  buildProductSchema,
  renderJsonLd,
  validateRichResultData,
} from '@noirstack/web-foundation/seo';

const organization = buildOrganizationSchema({
  name: 'Example',
  schemaType: 'Organization',
  url: 'https://example.com',
  sameAs: ['https://www.linkedin.com/company/example'],
});

const product = buildProductSchema({
  name: 'Platform',
  description: 'Managed data platform.',
  url: 'https://example.com/platform',
  offers: { price: 99, priceCurrency: 'USD', availability: 'InStock' },
  review: { ratingValue: 4.8, reviewCount: 37 },
});

const event = buildEventSchema({
  name: 'Platform briefing',
  url: 'https://example.com/events/briefing',
  startDate: new Date('2026-09-01T14:00:00Z'),
  eventAttendanceMode: 'OnlineEventAttendanceMode',
  location: { name: 'Live stream', url: 'https://example.com/live/briefing' },
  organizer: { name: 'Example', url: 'https://example.com' },
});

validateRichResultData(product);
const jsonLd = renderJsonLd([organization, product, event]);
```

`renderJsonLd` produces encapsulated `application/ld+json` scripts and escapes script-termination payloads. Validate deployed pages with Google's Rich Results Test and the Schema.org Markup Validator; eligibility remains subject to each search engine's content and structured-data policies.

## Crawlable Express and Vite applications

Pass sitemap sources to the Express adapter. `applyAll` registers `/robots.txt`, `/sitemap.xml`, each `/sitemap-{source}.xml`, and `/health`.

```ts
const wf = createExpressMiddleware({
  config,
  sitemapSources: [
    {
      name: 'pages',
      entries: async () => [
        {
          loc: 'https://example.com/platform',
          lastmod: new Date().toISOString(),
          changefreq: 'weekly',
          priority: 0.9,
        },
      ],
    },
  ],
});

wf.applyAll(app);
```

Render crawlable HTML from React, Vite SSR, or another server renderer by returning body markup and metadata:

```ts
app.get('*', wf.renderPage(async (req) => {
  const metadata = metadataBuilder.buildAll({
    title: 'Platform',
    description: 'A complete description for search results.',
    path: req.path,
  });

  // React example: renderToString(<App url={req.url} />)
  const bodyHtml = await renderApplication(req.url);
  return {
    metadata,
    bodyHtml: `<div id="root">${bodyHtml}</div>`,
    scripts: [{ src: '/assets/app.js', type: 'module' }],
  };
}));
```

For static generation, import `prerenderRoutes` from `@noirstack/web-foundation/rendering`. It produces complete HTML documents that can be written by the consumer's Vite or deployment build step.

Register status handlers after application routes:

```ts
app.get('/retired-page', wf.gone());
app.use(wf.notFound());
app.use(wf.errorHandler());
```

These helpers return explicit `301`, `404`, `410`, and `500` responses. HTML error responses can receive page metadata and are marked `noindex,nofollow` for server errors.

## Real-user performance and Core Web Vitals

The browser-only `performance` export wraps `web-vitals` 5.x and records CLS, INP, and LCP by default, with optional FCP and TTFB collection. It supports the standard and attribution builds, deterministic sampling, multiple reporters, `dataLayer`/GA4 mappings, beacon delivery, batching, and product/release/route context.

```ts
import {
  createBeaconReporter,
  createGa4DataLayerReporter,
  startWebVitals,
} from '@noirstack/web-foundation/performance';

await startWebVitals({
  product: 'judicium',
  environment: 'production',
  release: import.meta.env.VITE_RELEASE,
  route: () => location.pathname,
  collectAll: true,
  attribution: true,
  sampleRate: 0.1,
  visibilityState: () => document.visibilityState,
  reporter: [
    createGa4DataLayerReporter({ dataLayer: window.dataLayer }),
    createBeaconReporter({
      endpoint: '/api/rum/web-vitals',
      transport: {
        sendBeacon: navigator.sendBeacon.bind(navigator),
        fetch: window.fetch.bind(window),
      },
    }),
  ],
});
```

Each normalized event includes the metric name, ID, raw value, delta, rounded value, rating, navigation type, timestamp, and optional attribution target/load state. CLS rounding multiplies by 1,000. The GA4 reporter intentionally maps `value` to the metric delta so repeated CLS reports are not summed as repeated totals. The generic `dataLayer` reporter can namespace measurements by metric when consumers want to retain the latest value for every vital.

### Measurement and CrUX limitations

These measurements are real-user monitoring (RUM), not a replacement for CrUX:

- Browser performance APIs expose the current document only. They cannot observe iframe content, including same-origin frames. Events therefore declare `measurementScope: 'document'` and `includesIframeContent: false`.
- SPA soft navigations are not treated as full browser navigations by the underlying Core Web Vitals APIs. Events declare `softNavigation: false`; use the recorded route as segmentation context, not as a claim of per-soft-navigation vitals.
- CrUX contains opted-in Chrome traffic, while RUM populations vary by browser, consent, blockers, and sampling.
- Compare equivalent Chrome/device segments at the 75th percentile over a 28-day window when reconciling RUM with CrUX.
- CLS and INP can evolve throughout the page lifetime, and not every visit produces every metric. Beacon/keepalive delivery helps preserve late reports.
- Cross-origin LCP resources, background tabs, bfcache restores, and browser implementation differences can also create discrepancies.

Attribution selectors may contain application identifiers. The default sanitizer trims and caps targets at 256 characters; products handling sensitive identifiers should provide `sanitizeDebugTarget` or disable attribution. Measurement can start before analytics consent, but reporters that transmit or persist data must be gated with `enabled` according to the product's consent policy.

Implementation guidance was aligned with the official `web-vitals` limitations, the CrUX/RUM comparison guidance, and Simo Ahava's Core Web Vitals dataLayer and GA4 patterns.

## Shared SEO and accessibility audit toolkit

The `audit` export centralizes quality gates for Lighthouse CI, Linkinator, axe-core, HTML Validate, and Puppeteer-based rendered-page inspection. These tools are optional peer dependencies so production applications do not download browsers or audit CLIs.

```ts
import {
  auditRenderedPage,
  createLighthousePreset,
  createLinkinatorPreset,
} from '@noirstack/web-foundation/audit';

export default createLighthousePreset({
  performanceScore: 0.8,
  accessibilityScore: 0.95,
  seoScore: 0.95,
});

const crawler = createLinkinatorPreset({
  serverRoot: 'https://preview.example.com',
});
```

The complete external audit suite currently requires Node 22 because the latest HTML Validate and Puppeteer releases require it. The normal `web-foundation` runtime remains compatible with Node 20. Audit tooling should run in a dedicated CI job against a built preview or deployment.

## SEO media and AI-content pipeline

The opt-in `media` export accepts a Sharp-compatible pipeline and generates AVIF, WebP, and JPEG responsive variants, explicit dimensions, `srcset` descriptors, and 1200×630 social cards. Sharp remains an optional peer dependency so services that do not process media avoid its native installation.

```ts
import sharp from 'sharp';
import {
  buildResponsiveImageSources,
  optimizeSeoImage,
} from '@noirstack/web-foundation/media';

const variants = await optimizeSeoImage(sharp(inputBuffer), {
  originalWidth: 2400,
  originalHeight: 1350,
  includeSocialCard: true,
});
const sources = buildResponsiveImageSources('/media/investigation', variants);
```

The `content` export provides a Remark-compatible lint preset and a publication gate for AI-generated public material. It checks canonical hygiene, one H1, heading progression, duplicate headings, descriptive links and image alternatives, minimum substance, citations, named human review, safe URLs, and required media transcripts.

## Development

```bash
npm ci
npm run check
npm pack --dry-run
```

CI verifies Node 20 and Node 22. See [SECURITY.md](SECURITY.md) for vulnerability reporting and deployment responsibilities.

## License

MIT
