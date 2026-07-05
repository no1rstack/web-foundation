import type { SitemapEntry, SitemapSource, SeoConfig } from '../types.js';

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function generateSitemapXml(entries: SitemapEntry[]): string {
  const urlEntries = entries
    .map(
      (url) =>
        `  <url>
    <loc>${escapeXml(url.loc)}</loc>
    ${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ''}
    ${url.changefreq ? `<changefreq>${url.changefreq}</changefreq>` : ''}
    ${url.priority !== undefined ? `<priority>${url.priority.toFixed(1)}</priority>` : ''}
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
}

export function generateSitemapIndex(
  sitemaps: Array<{ loc: string; lastmod?: string }>
): string {
  const entries = sitemaps
    .map(
      (sm) =>
        `  <sitemap>
    <loc>${escapeXml(sm.loc)}</loc>
    ${sm.lastmod ? `<lastmod>${sm.lastmod}</lastmod>` : ''}
  </sitemap>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>`;
}

export async function buildMultiSitemap(
  baseUrl: string,
  sources: SitemapSource[],
  seoConfig?: SeoConfig
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  for (const source of sources) {
    const entries =
      typeof source.entries === 'function'
        ? await source.entries()
        : source.entries;

    const maxEntries = seoConfig?.sitemapGroups?.find((g) => g.name === source.name)?.maxEntries;
    const limited = maxEntries ? entries.slice(0, maxEntries) : entries;

    const xml = generateSitemapXml(limited);
    results.set(source.name, xml);
  }

  return results;
}

export function buildSitemapIndexFromSources(
  baseUrl: string,
  sources: SitemapSource[]
): string {
  const sitemaps = sources
    .filter((s) => s.includeInIndex !== false)
    .map((s) => ({
      loc: `${baseUrl.replace(/\/$/, '')}/sitemap-${s.name}.xml`,
    }));

  return generateSitemapIndex(sitemaps);
}

export function createStaticSitemapSource(
  name: string,
  entries: SitemapEntry[],
  includeInIndex?: boolean
): SitemapSource {
  return { name, entries, includeInIndex };
}

export function createDynamicSitemapSource(
  name: string,
  fetcher: () => Promise<SitemapEntry[]>,
  includeInIndex?: boolean
): SitemapSource {
  return { name, entries: fetcher, includeInIndex };
}

export function deduplicateSitemapEntries(entries: SitemapEntry[]): SitemapEntry[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const normalized = entry.loc.toLowerCase();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

export function filterIndexableEntries(
  entries: SitemapEntry[],
  shouldInclude: (entry: SitemapEntry) => boolean
): SitemapEntry[] {
  return entries.filter(shouldInclude);
}

export interface SitemapReport {
  total: number;
  included: number;
  excluded: number;
  blockedByQuality: string[];
  byGroup: Record<string, { total: number; included: number; excluded: number }>;
}

export function generateSitemapReport(
  sources: SitemapSource[],
  allEntries: Map<string, SitemapEntry[]>,
  excludedEntries: Map<string, SitemapEntry[]>
): SitemapReport {
  const byGroup: SitemapReport['byGroup'] = {};
  let total = 0;
  let included = 0;
  let excluded = 0;
  const blockedByQuality: string[] = [];

  for (const source of sources) {
    const entries = allEntries.get(source.name) || [];
    const blocked = excludedEntries.get(source.name) || [];

    byGroup[source.name] = {
      total: entries.length + blocked.length,
      included: entries.length,
      excluded: blocked.length,
    };

    total += byGroup[source.name].total;
    included += byGroup[source.name].included;
    excluded += byGroup[source.name].excluded;
    blockedByQuality.push(...blocked.map((e) => e.loc));
  }

  return { total, included, excluded, blockedByQuality, byGroup };
}
