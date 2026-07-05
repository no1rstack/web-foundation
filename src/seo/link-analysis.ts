import type { LinkAnalysisReport } from '../types.js';

export interface PageData {
  url: string;
  title?: string;
  description?: string;
  internalLinks: string[];
  incomingLinks: string[];
  inSitemap: boolean;
  statusCode: number;
  canonicalUrl?: string;
}

export function detectOrphanPages(pages: PageData[]): string[] {
  return pages
    .filter((page) => page.incomingLinks.length === 0 && page.url !== '/')
    .map((page) => page.url);
}

export function detectBrokenLinks(
  pages: PageData[]
): Array<{ from: string; to: string; status: number }> {
  const brokenLinks: Array<{ from: string; to: string; status: number }> = [];
  const validUrls = new Set(pages.map((p) => p.url));

  for (const page of pages) {
    for (const link of page.internalLinks) {
      if (link.startsWith('/') && !validUrls.has(link)) {
        brokenLinks.push({ from: page.url, to: link, status: 404 });
      }
    }
  }

  return brokenLinks;
}

export function detectMissingMetadata(pages: PageData[]): Array<{ url: string; missing: string[] }> {
  const results: Array<{ url: string; missing: string[] }> = [];

  for (const page of pages) {
    const missing: string[] = [];

    if (!page.title || page.title.length < 10) missing.push('title');
    if (!page.description || page.description.length < 50) missing.push('description');
    if (!page.canonicalUrl) missing.push('canonicalUrl');

    if (missing.length > 0) {
      results.push({ url: page.url, missing });
    }
  }

  return results;
}

export function detectDuplicateMetadata(
  pages: PageData[]
): Array<{ url: string; type: string; duplicateOf: string }> {
  const results: Array<{ url: string; type: string; duplicateOf: string }> = [];
  const titleMap = new Map<string, string>();
  const descMap = new Map<string, string>();

  for (const page of pages) {
    if (page.title) {
      const normalized = page.title.toLowerCase().trim();
      const existing = titleMap.get(normalized);
      if (existing) {
        results.push({ url: page.url, type: 'title', duplicateOf: existing });
      } else {
        titleMap.set(normalized, page.url);
      }
    }

    if (page.description) {
      const normalized = page.description.toLowerCase().trim();
      const existing = descMap.get(normalized);
      if (existing) {
        results.push({ url: page.url, type: 'description', duplicateOf: existing });
      } else {
        descMap.set(normalized, page.url);
      }
    }
  }

  return results;
}

export function detectSitemapMismatches(
  pages: PageData[]
): Array<{ url: string; issue: string }> {
  const results: Array<{ url: string; issue: string }> = [];

  for (const page of pages) {
    if (page.statusCode < 200 || page.statusCode >= 300) continue;

    if (page.inSitemap && page.statusCode >= 400) {
      results.push({ url: page.url, issue: 'In sitemap but returns error status' });
    }
    if (!page.inSitemap && page.statusCode < 300 && page.url !== '/') {
      const isLikelyExcluded =
        page.url.startsWith('/api/') ||
        page.url.startsWith('/admin/') ||
        page.url.startsWith('/auth/') ||
        page.url.startsWith('/dashboard/');

      if (!isLikelyExcluded) {
        results.push({ url: page.url, issue: 'Indexable but not in any sitemap' });
      }
    }
  }

  return results;
}

export function recommendInternalLinks(pages: PageData[]): Array<{ from: string; to: string; reason: string }> {
  const recommendations: Array<{ from: string; to: string; reason: string }> = [];

  const relatedKeywords = new Map<string, string[]>(); // url -> keywords

  for (const page of pages) {
    const keywords: string[] = [];
    if (page.title) {
      keywords.push(...page.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3));
    }
    if (page.description) {
      keywords.push(...page.description.toLowerCase().split(/\s+/).filter((w) => w.length > 3));
    }
    relatedKeywords.set(page.url, [...new Set(keywords)]);
  }

  const pagesByKeyword = new Map<string, string[]>();
  for (const [url, keywords] of relatedKeywords) {
    for (const kw of keywords) {
      const existing = pagesByKeyword.get(kw) || [];
      existing.push(url);
      pagesByKeyword.set(kw, existing);
    }
  }

  for (const page of pages) {
    if (page.incomingLinks.length >= 3) continue; // well-linked

    const existingLinks = new Set(page.incomingLinks);
    const pageKeywords = relatedKeywords.get(page.url) || [];

    for (const kw of pageKeywords) {
      const related = pagesByKeyword.get(kw) || [];
      for (const candidate of related) {
        if (candidate === page.url) continue;
        if (existingLinks.has(candidate)) continue;

        recommendations.push({
          from: candidate,
          to: page.url,
          reason: `Shared keyword "${kw}"`,
        });
        break;
      }
      if (recommendations.some((r) => r.to === page.url)) break;
    }
  }

  return recommendations;
}

export function runLinkAnalysis(
  pages: PageData[]
): LinkAnalysisReport {
  return {
    orphanPages: detectOrphanPages(pages),
    brokenLinks: detectBrokenLinks(pages),
    missingMetadata: detectMissingMetadata(pages),
    duplicateMetadata: detectDuplicateMetadata(pages),
    sitemapMismatches: detectSitemapMismatches(pages),
    recommendations: recommendInternalLinks(pages),
  };
}

export function formatLinkReport(report: LinkAnalysisReport): string {
  const lines: string[] = ['=== Internal Link Analysis Report ===', ''];

  if (report.orphanPages.length > 0) {
    lines.push(`Orphan Pages (${report.orphanPages.length}):`);
    report.orphanPages.forEach((url) => lines.push(`  - ${url}`));
    lines.push('');
  }

  if (report.brokenLinks.length > 0) {
    lines.push(`Broken Internal Links (${report.brokenLinks.length}):`);
    report.brokenLinks.forEach((l) => lines.push(`  - ${l.from} -> ${l.to} (${l.status})`));
    lines.push('');
  }

  if (report.missingMetadata.length > 0) {
    lines.push(`Missing Metadata (${report.missingMetadata.length}):`);
    report.missingMetadata.forEach((m) =>
      lines.push(`  - ${m.url}: missing ${m.missing.join(', ')}`)
    );
    lines.push('');
  }

  if (report.duplicateMetadata.length > 0) {
    lines.push(`Duplicate Metadata (${report.duplicateMetadata.length}):`);
    report.duplicateMetadata.forEach((d) =>
      lines.push(`  - ${d.url}: duplicate ${d.type} of ${d.duplicateOf}`)
    );
    lines.push('');
  }

  if (report.sitemapMismatches.length > 0) {
    lines.push(`Sitemap Mismatches (${report.sitemapMismatches.length}):`);
    report.sitemapMismatches.forEach((s) => lines.push(`  - ${s.url}: ${s.issue}`));
    lines.push('');
  }

  if (report.recommendations.length > 0) {
    lines.push(`Link Recommendations (${report.recommendations.length}):`);
    report.recommendations.forEach((r) =>
      lines.push(`  - ${r.from} -> ${r.to}: ${r.reason}`)
    );
    lines.push('');
  }

  if (
    report.orphanPages.length === 0 &&
    report.brokenLinks.length === 0 &&
    report.missingMetadata.length === 0 &&
    report.duplicateMetadata.length === 0 &&
    report.sitemapMismatches.length === 0
  ) {
    lines.push('No issues found.');
  }

  return lines.join('\n');
}
