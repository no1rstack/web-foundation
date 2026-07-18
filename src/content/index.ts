export type ContentIssueSeverity = 'error' | 'warning';

export interface ContentIssue {
  code: string;
  severity: ContentIssueSeverity;
  message: string;
  line?: number;
}

export interface AiContentAuditInput {
  title: string;
  description: string;
  canonicalUrl: string;
  markdown: string;
  author?: string;
  reviewedBy?: string;
  generatedWithAi?: boolean;
  citations?: string[];
  transcriptRequired?: boolean;
  transcript?: string;
  minimumWords?: number;
}

export interface AiContentAuditResult {
  publicationReady: boolean;
  wordCount: number;
  issues: ContentIssue[];
}

export const remarkSeoPreset = {
  plugins: [
    'remark-preset-lint-recommended',
    'remark-lint-heading-increment',
    'remark-lint-no-duplicate-headings',
    'remark-lint-no-empty-url',
    'remark-lint-no-reference-like-url',
    'remark-lint-no-undefined-references',
    'remark-lint-final-newline',
  ],
} as const;

function markdownWordCount(markdown: string): number {
  return markdown
    .replace(/~~~[\s\S]*?~~~/g, ' ')
    .replace(/!?(?:\[[^\]]*\])\([^)]*\)/g, ' ')
    .replace(/[#>*_~|\-]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function auditAiContent(input: AiContentAuditInput): AiContentAuditResult {
  const issues: ContentIssue[] = [];
  const add = (
    code: string,
    message: string,
    severity: ContentIssueSeverity = 'error',
    line?: number,
  ) => issues.push({ code, message, severity, line });

  if (!input.title.trim()) add('title-missing', 'Content title is required');
  else if (input.title.length > 60) add('title-length', 'Title exceeds 60 characters', 'warning');
  if (!input.description.trim()) add('description-missing', 'Meta description is required');
  else if (input.description.length > 170) {
    add('description-length', 'Meta description exceeds 170 characters', 'warning');
  }
  try {
    const canonical = new URL(input.canonicalUrl);
    if (canonical.protocol !== 'https:') add('canonical-https', 'Canonical URL must use HTTPS');
    if (canonical.search || canonical.hash) {
      add('canonical-clean', 'Canonical URL should not contain query parameters or fragments');
    }
  } catch {
    add('canonical-invalid', 'Canonical URL must be absolute');
  }

  const lines = input.markdown.split(/\r?\n/);
  const headings: Array<{ level: number; text: string; line: number }> = [];
  const seen = new Map<string, number>();
  let inFence = false;
  lines.forEach((line, index) => {
    if (/^\s*~~~/.test(line)) inFence = !inFence;
    if (inFence) return;
    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      const item = { level: heading[1].length, text: heading[2].trim(), line: index + 1 };
      headings.push(item);
      const key = item.text.toLocaleLowerCase();
      if (seen.has(key)) add('heading-duplicate', 'Duplicate heading: ' + item.text, 'warning', item.line);
      else seen.set(key, item.line);
    }
    for (const image of line.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)) {
      if (!image[1].trim()) add('image-alt', 'Markdown image is missing alternative text', 'error', index + 1);
    }
    for (const link of line.matchAll(/(?<!!)\[([^\]]*)\]\(([^)]*)\)/g)) {
      if (!link[1].trim()) add('link-text', 'Markdown link has no descriptive text', 'error', index + 1);
      if (!link[2].trim()) add('link-url', 'Markdown link has no destination', 'error', index + 1);
      if (/^javascript:/i.test(link[2].trim())) add('link-unsafe', 'JavaScript URLs are not allowed', 'error', index + 1);
    }
  });

  const h1 = headings.filter((heading) => heading.level === 1);
  if (h1.length !== 1) add('h1-count', 'Expected exactly one H1, found ' + h1.length);
  for (let index = 1; index < headings.length; index += 1) {
    if (headings[index].level > headings[index - 1].level + 1) {
      add('heading-increment', 'Heading levels must not skip ranks', 'error', headings[index].line);
    }
  }

  const wordCount = markdownWordCount(input.markdown);
  const minimumWords = input.minimumWords ?? 150;
  if (wordCount < minimumWords) {
    add('content-thin', 'Content has ' + wordCount + ' words; expected at least ' + minimumWords, 'warning');
  }
  if (!input.author?.trim()) add('author-missing', 'Content author or responsible organization is required');
  if (input.generatedWithAi && !input.reviewedBy?.trim()) {
    add('human-review-missing', 'AI-generated public content requires a named human reviewer');
  }
  if (input.generatedWithAi && !input.citations?.length) {
    add('citations-missing', 'AI-generated factual content should include source citations');
  }
  for (const citation of input.citations ?? []) {
    try {
      const url = new URL(citation);
      if (!['https:', 'http:'].includes(url.protocol)) throw new Error();
    } catch {
      add('citation-invalid', 'Citation must be an absolute HTTP URL: ' + citation);
    }
  }
  if (input.transcriptRequired && !input.transcript?.trim()) {
    add('transcript-missing', 'A transcript is required for this media content');
  }

  return {
    publicationReady: !issues.some((issue) => issue.severity === 'error'),
    wordCount,
    issues,
  };
}

export const recommendedContentTooling = {
  remark: '15.0.1',
  remarkLint: '10.0.1',
  sharp: '0.35.3',
} as const;
