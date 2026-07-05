import express from 'express';
import { createWebFoundation, createExpressMiddleware, MetadataBuilder, computeQualityScore, analyzeContent } from '@no1rstack/web-foundation';

const config = createWebFoundation({
  environment: 'development',
  app: {
    name: 'Example App',
    slug: 'example-app',
    baseUrl: 'http://localhost:3000',
    brandName: 'ExampleCo',
    defaultTitle: 'Example App - Your Go-To Platform',
    defaultDescription: 'An example app using the web-foundation platform.',
    logo: 'http://localhost:3000/logo.png',
    themeColor: '#2563eb',
    supportedLocales: ['en', 'es'],
  },
  seo: {
    sitemapGroups: [
      { name: 'pages', path: '/pages', changefreq: 'weekly', priority: 0.8 },
      { name: 'blog', path: '/blog', changefreq: 'daily', priority: 0.9 },
      { name: 'docs', path: '/docs', changefreq: 'monthly', priority: 0.7 },
    ],
    canonicalRules: {
      trailingSlash: 'remove',
      stripTrackingParams: true,
      lowercasePath: true,
    },
  },
  robots: {
    defaultDirective: 'index,follow',
    disallowPaths: ['/api/*', '/admin/*', '/workspace/*'],
  },
  ipTracking: {
    enabled: true,
    hashSalt: 'example-app-salt',
    botScoring: true,
  },
  rateLimit: {
    enabled: true,
    globalMax: 1000,
    rules: [
      { path: '/api/*', windowMs: 60_000, max: 30, keyType: 'ip', action: 'block' },
      { path: '/login', method: 'POST', windowMs: 60_000, max: 5, keyType: 'ip', action: 'block' },
    ],
  },
  quality: {
    scoreThreshold: 60,
    requireUniqueTitle: true,
    requireMetaDescription: true,
    minContentWords: 100,
    aiContentFlagging: true,
    autoBlock: false,
  },
});

const app = express();
app.set('trust proxy', true);

const middleware = createExpressMiddleware({
  config,
  onRequestLog: (data) => {
    console.log(`[${data.method}] ${data.path} → ${data.statusCode} (${data.responseTimeMs}ms)`);
  },
});

middleware.applyAll(app);

const metadata = new MetadataBuilder({
  baseUrl: config.app.baseUrl,
  brandName: config.app.brandName,
  defaultTitle: config.app.defaultTitle,
  defaultDescription: config.app.defaultDescription,
  logo: config.app.logo,
  themeColor: config.app.themeColor,
});

app.get('/', (_req, res) => {
  const pageMeta = metadata.buildAll({
    title: 'Home',
    description: 'Welcome to the example app built on web-foundation.',
    path: '/',
  });

  const { wordCount } = analyzeContent('# Welcome\n\nThis is a sample content page with useful information.');

  const score = computeQualityScore({
    title: pageMeta.title,
    metaDescription: pageMeta.description,
    contentWords: wordCount,
    internalLinks: 3,
    inboundLinks: 2,
    hasStructuredData: true,
    hasCanonicalUrl: true,
    hasOpenGraph: true,
    hasExamples: true,
    hasHeadings: true,
    hasImageAlt: true,
    imageCount: 0,
    imageWithAltCount: 0,
  });

  res.json({
    metadata: pageMeta,
    qualityScore: score,
    requestMeta: (req as any).requestMetadata,
    traceId: (req as any).traceId,
  });
});

app.get('/api/example', (_req, res) => {
  res.json({ message: 'API is working', timestamp: new Date().toISOString() });
});

app.listen(3000, () => {
  console.log('Example app running on http://localhost:3000');
  console.log('Try: curl http://localhost:3000/');
  console.log('     curl http://localhost:3000/robots.txt');
  console.log('     curl http://localhost:3000/health');
  console.log('     curl http://localhost:3000/api/example');
});
