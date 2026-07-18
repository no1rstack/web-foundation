export type SeoImageFormat = 'avif' | 'webp' | 'jpeg';

export interface SharpPipelineLike {
  clone(): SharpPipelineLike;
  resize(options: {
    width: number;
    height?: number;
    fit?: 'cover' | 'inside';
    withoutEnlargement?: boolean;
  }): SharpPipelineLike;
  avif(options?: { quality?: number; effort?: number }): SharpPipelineLike;
  webp(options?: { quality?: number; effort?: number }): SharpPipelineLike;
  jpeg(options?: { quality?: number; progressive?: boolean }): SharpPipelineLike;
  toBuffer(): Promise<Uint8Array>;
}

export interface SeoImageVariant {
  width: number;
  height?: number;
  format: SeoImageFormat;
  mediaType: string;
  suffix: string;
  data: Uint8Array;
}

export interface SeoImageOptimizationOptions {
  widths?: number[];
  formats?: SeoImageFormat[];
  quality?: Partial<Record<SeoImageFormat, number>>;
  originalWidth?: number;
  originalHeight?: number;
  includeSocialCard?: boolean;
  socialCardWidth?: number;
  socialCardHeight?: number;
}

function formatPipeline(
  pipeline: SharpPipelineLike,
  format: SeoImageFormat,
  quality: number,
): SharpPipelineLike {
  if (format === 'avif') return pipeline.avif({ quality, effort: 4 });
  if (format === 'webp') return pipeline.webp({ quality, effort: 4 });
  return pipeline.jpeg({ quality, progressive: true });
}

function mediaType(format: SeoImageFormat): string {
  return format === 'jpeg' ? 'image/jpeg' : `image/${format}`;
}

export async function optimizeSeoImage(
  source: SharpPipelineLike,
  options: SeoImageOptimizationOptions = {},
): Promise<SeoImageVariant[]> {
  const formats = options.formats ?? ['avif', 'webp', 'jpeg'];
  const widths = [...new Set(options.widths ?? [320, 640, 960, 1280, 1600])]
    .filter((width) => Number.isInteger(width) && width > 0)
    .filter((width) => !options.originalWidth || width <= options.originalWidth)
    .sort((a, b) => a - b);
  const quality = { avif: 55, webp: 78, jpeg: 82, ...options.quality };
  const variants: SeoImageVariant[] = [];

  for (const width of widths) {
    const height = options.originalWidth && options.originalHeight
      ? Math.round(width * options.originalHeight / options.originalWidth)
      : undefined;
    for (const format of formats) {
      const pipeline = source.clone().resize({
        width,
        fit: 'inside',
        withoutEnlargement: true,
      });
      variants.push({
        width,
        height,
        format,
        mediaType: mediaType(format),
        suffix: `-${width}w.${format === 'jpeg' ? 'jpg' : format}`,
        data: await formatPipeline(pipeline, format, quality[format]).toBuffer(),
      });
    }
  }

  if (options.includeSocialCard) {
    const width = options.socialCardWidth ?? 1200;
    const height = options.socialCardHeight ?? 630;
    for (const format of formats.filter((value) => value !== 'avif')) {
      const pipeline = source.clone().resize({
        width,
        height,
        fit: 'cover',
        withoutEnlargement: false,
      });
      variants.push({
        width,
        height,
        format,
        mediaType: mediaType(format),
        suffix: `-social-${width}x${height}.${format === 'jpeg' ? 'jpg' : format}`,
        data: await formatPipeline(pipeline, format, quality[format]).toBuffer(),
      });
    }
  }

  return variants;
}

export interface ResponsiveImageSource {
  type: string;
  srcset: string;
}

export function buildResponsiveImageSources(
  basePath: string,
  variants: readonly Pick<SeoImageVariant, 'width' | 'format' | 'mediaType' | 'suffix'>[],
): ResponsiveImageSource[] {
  const byFormat = new Map<SeoImageFormat, typeof variants>();
  for (const format of ['avif', 'webp', 'jpeg'] as const) {
    byFormat.set(format, variants.filter((variant) =>
      variant.format === format && !variant.suffix.includes('-social-')));
  }
  return [...byFormat.entries()]
    .filter(([, values]) => values.length > 0)
    .map(([, values]) => ({
      type: values[0].mediaType,
      srcset: values
        .map((variant) => `${basePath}${variant.suffix} ${variant.width}w`)
        .join(', '),
    }));
}

export interface MediaSeoMetadata {
  width: number;
  height: number;
  alt: string;
  caption?: string;
  credit?: string;
  licenseUrl?: string;
  transcript?: string;
}

export function validateMediaSeo(metadata: Partial<MediaSeoMetadata>): string[] {
  const issues: string[] = [];
  if (!metadata.width || !metadata.height) issues.push('Explicit media dimensions are required');
  if (!metadata.alt?.trim()) issues.push('Descriptive alternative text is required');
  if (metadata.alt && metadata.alt.length > 300) issues.push('Alternative text should be concise');
  if (metadata.licenseUrl) {
    try { new URL(metadata.licenseUrl); } catch { issues.push('License URL must be absolute'); }
  }
  return issues;
}
