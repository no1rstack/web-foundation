export interface ContentAnalysis {
  wordCount: number;
  uniqueWordCount: number;
  hasHeadings: boolean;
  headingCount: number;
  hasExamples: boolean;
  hasCodeBlocks: boolean;
  hasTables: boolean;
  hasLists: boolean;
  hasImages: boolean;
  imageCount: number;
  readingTimeSeconds: number;
  linkCount: number;
  internalLinkCount: number;
  externalLinkCount: number;
  isAiGenerated: boolean;
  hasCitations: boolean;
  hasFactualGrounding: boolean;
  aiConfidence: number;
}

export function countWords(text: string): number {
  if (!text) return 0;
  const cleaned = stripMarkdown(text);
  return (cleaned.match(/\b\w+\b/g) || []).length;
}

export function countUniqueWords(text: string): number {
  if (!text) return 0;
  const cleaned = stripMarkdown(text);
  const words = cleaned.match(/\b\w+\b/g) || [];
  return new Set(words.map((w) => w.toLowerCase())).size;
}

export function detectHeadings(markdown: string): {
  hasHeadings: boolean;
  headingCount: number;
} {
  const headings = markdown.match(/^#{1,6}\s/gm);
  return {
    hasHeadings: !!headings,
    headingCount: headings ? headings.length : 0,
  };
}

export function detectExamples(markdown: string): boolean {
  return (
    /```[\s\S]*?```/.test(markdown) || // code blocks
    /^\s*[-*]\s/.test(markdown) || // list items (potential examples)
    /\bexample\b/i.test(markdown) || // literal "example"
    /\be\.g\.\b/i.test(markdown) || // e.g.
    /\bfor instance\b/i.test(markdown) || // for instance
    /\bfor example\b/i.test(markdown) // for example
  );
}

export function detectCodeBlocks(markdown: string): boolean {
  return /```[\s\S]*?```/.test(markdown);
}

export function detectTables(markdown: string): boolean {
  return /\|[\s\S]*\|.*\n\|[-:| ]+\|/.test(markdown);
}

export function detectLists(markdown: string): boolean {
  return /^(\s*[-*+]\s|\s*\d+\.\s)/m.test(markdown);
}

export function detectImages(markdown: string): { hasImages: boolean; imageCount: number } {
  const matches = markdown.match(/!\[.*?\]\(.*?\)/g);
  return {
    hasImages: !!matches,
    imageCount: matches ? matches.length : 0,
  };
}

export function estimateReadingTime(wordCount: number): number {
  const WORDS_PER_MINUTE = 238;
  return Math.ceil(wordCount / WORDS_PER_MINUTE * 60);
}

export function countLinks(markdown: string): {
  total: number;
  internal: number;
  external: number;
} {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const links: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(markdown)) !== null) {
    links.push(match[2]);
  }

  const external = links.filter((l) => l.startsWith('http://') || l.startsWith('https://'));
  const internal = links.filter((l) => l.startsWith('/') || l.startsWith('#'));

  return {
    total: links.length,
    internal: internal.length,
    external: external.length,
  };
}

export function detectAiContent(text: string): {
  isAiGenerated: boolean;
  confidence: number;
  hasCitations: boolean;
  hasFactualGrounding: boolean;
} {
  let confidence = 0;
  const indicators: Array<{ pattern: RegExp; weight: number }> = [
    { pattern: /\bAs an AI\b/i, weight: 80 },
    { pattern: /\bI (do not have|don't have) (personal|real-time|current)\b/i, weight: 70 },
    { pattern: /\bPlease note that\b/i, weight: 40 },
    { pattern: /\bIt('s| is) important to (note|remember|consider)\b/i, weight: 30 },
    { pattern: /\bIn conclusion\b/i, weight: 20 },
    { pattern: /\bFurthermore\b[\s,;:.]*\bmoreover\b/i, weight: 25 },
    { pattern: /\bIt is (also )?worth noting\b/i, weight: 30 },
    { pattern: /\bUltimately\b[\s,;:.]*\bIn conclusion\b/i, weight: 25 },
    { pattern: /\bDelve into\b/i, weight: 40 },
    { pattern: /\bTapestry\b/i, weight: 30 },
    { pattern: /\bLandscape\b[\s,;:.]*\bever-evolving\b/i, weight: 30 },
    { pattern: /\bIn today's (digital |fast-paced |modern )?world\b/i, weight: 40 },
    { pattern: /^(It is important to note|It should be noted|One should note)/mi, weight: 25 },
  ];

  let matched = 0;
  for (const { pattern, weight } of indicators) {
    if (pattern.test(text)) {
      confidence += weight;
      matched++;
    }
  }

  if (matched > 0) {
    confidence = Math.min(confidence / matched, 100);
  }

  const hasCitations =
    /\b(https?:\/\/|\(\s*[A-Z][a-z]+,\s*\d{4}\)|\[\d+\]|\(et\s+al\.?,?\s*\d{4}\))/i.test(text);
  const hasFactualGrounding =
    /\b(according to|research (by|from)|(study|studies) (show|found|indicate|suggest|demonstrate)|reported (by|in)|published (in|by))/i.test(text);

  return {
    isAiGenerated: confidence >= 25,
    confidence: Math.round(confidence),
    hasCitations,
    hasFactualGrounding,
  };
}

export function detectThinContent(wordCount: number, minWords: number = 100): boolean {
  return wordCount < minWords;
}

export function analyzeContent(
  markdown: string,
  options?: { minContentWords?: number }
): ContentAnalysis {
  const wordCount = countWords(markdown);
  const { hasHeadings, headingCount } = detectHeadings(markdown);
  const { hasImages, imageCount } = detectImages(markdown);
  const links = countLinks(markdown);
  const ai = detectAiContent(markdown);

  return {
    wordCount,
    uniqueWordCount: countUniqueWords(markdown),
    hasHeadings,
    headingCount,
    hasExamples: detectExamples(markdown),
    hasCodeBlocks: detectCodeBlocks(markdown),
    hasTables: detectTables(markdown),
    hasLists: detectLists(markdown),
    hasImages,
    imageCount,
    readingTimeSeconds: estimateReadingTime(wordCount),
    linkCount: links.total,
    internalLinkCount: links.internal,
    externalLinkCount: links.external,
    isAiGenerated: ai.isAiGenerated,
    hasCitations: ai.hasCitations,
    hasFactualGrounding: ai.hasFactualGrounding,
    aiConfidence: ai.confidence,
  };
}

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s/gm, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/^[-*+]\s/gm, '')
    .replace(/^\d+\.\s/gm, '')
    .replace(/>\s/gm, '')
    .replace(/\|/g, ' ')
    .replace(/^---+/gm, '')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

export const similarityCheck = {
  jaccard(text1: string, text2: string): number {
    const words1 = new Set((text1 || '').toLowerCase().match(/\b\w+\b/g) || []);
    const words2 = new Set((text2 || '').toLowerCase().match(/\b\w+\b/g) || []);

    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    if (union.size === 0) return 0;
    return intersection.size / union.size;
  },

  cosine(text1: string, text2: string): number {
    const words1 = (text1 || '').toLowerCase().match(/\b\w+\b/g) || [];
    const words2 = (text2 || '').toLowerCase().match(/\b\w+\b/g) || [];

    const freq1 = new Map<string, number>();
    const freq2 = new Map<string, number>();

    for (const w of words1) freq1.set(w, (freq1.get(w) || 0) + 1);
    for (const w of words2) freq2.set(w, (freq2.get(w) || 0) + 1);

    const allWords = new Set([...freq1.keys(), ...freq2.keys()]);

    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;

    for (const w of allWords) {
      const f1 = freq1.get(w) || 0;
      const f2 = freq2.get(w) || 0;
      dotProduct += f1 * f2;
      mag1 += f1 * f1;
      mag2 += f2 * f2;
    }

    mag1 = Math.sqrt(mag1);
    mag2 = Math.sqrt(mag2);

    if (mag1 === 0 || mag2 === 0) return 0;
    return dotProduct / (mag1 * mag2);
  },
};
