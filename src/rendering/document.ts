import type { PageMetadata } from '../seo/metadata.js';
import { renderMetadataTags } from '../seo/metadata.js';

export interface HtmlDocumentInput {
  metadata: PageMetadata;
  bodyHtml: string;
  language?: string;
  headHtml?: string;
  bodyAttributes?: Record<string, string>;
  htmlAttributes?: Record<string, string>;
  scripts?: Array<{ src: string; type?: string; async?: boolean; defer?: boolean }>;
}

export interface PrerenderRoute {
  path: string;
  metadata: PageMetadata;
}

export interface PrerenderResult {
  path: string;
  html: string;
}

export type RouteRenderer = (route: PrerenderRoute) => string | Promise<string>;

export function renderHtmlDocument(input: HtmlDocumentInput): string {
  const language = input.language || 'en';
  const htmlAttrs = renderAttributes({ lang: language, ...(input.htmlAttributes || {}) });
  const bodyAttrs = renderAttributes(input.bodyAttributes || {});
  const scripts = (input.scripts || []).map((script) => {
    const attrs = renderAttributes({
      src: script.src,
      ...(script.type ? { type: script.type } : {}),
      ...(script.async ? { async: '' } : {}),
      ...(script.defer ? { defer: '' } : {}),
    });
    return `<script${attrs}></script>`;
  }).join('\n');

  return `<!doctype html>
<html${htmlAttrs}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${renderMetadataTags(input.metadata)}
${input.headHtml || ''}
</head>
<body${bodyAttrs}>
${input.bodyHtml}
${scripts}
</body>
</html>`;
}

export function injectDocumentHead(documentHtml: string, metadata: PageMetadata, extraHead = ''): string {
  const tags = `${renderMetadataTags(metadata)}${extraHead ? `\n${extraHead}` : ''}`;
  if (/<\/head>/i.test(documentHtml)) return documentHtml.replace(/<\/head>/i, `${tags}\n</head>`);
  throw new Error('Cannot inject metadata: document does not contain a closing </head> tag');
}

export async function prerenderRoutes(routes: PrerenderRoute[], render: RouteRenderer): Promise<PrerenderResult[]> {
  const results: PrerenderResult[] = [];
  for (const route of routes) {
    const bodyHtml = await render(route);
    results.push({
      path: route.path,
      html: renderHtmlDocument({ metadata: route.metadata, bodyHtml }),
    });
  }
  return results;
}

function renderAttributes(attributes: Record<string, string>): string {
  const values = Object.entries(attributes).map(([name, value]) => {
    const safeName = name.replace(/[^a-zA-Z0-9:_-]/g, '');
    if (!safeName) return '';
    if (value === '') return ` ${safeName}`;
    return ` ${safeName}="${escapeAttribute(value)}"`;
  });
  return values.join('');
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
