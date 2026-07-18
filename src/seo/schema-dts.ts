import type {
  AudioObject,
  DataCatalog,
  Dataset,
  Graph,
  ImageObject,
  Organization,
  Person,
  SoftwareApplication,
  Thing,
  VideoObject,
  WithContext,
} from 'schema-dts';

export type {
  AudioObject,
  DataCatalog,
  Dataset,
  Graph,
  ImageObject,
  Organization,
  Person,
  SoftwareApplication,
  Thing,
  VideoObject,
  WithContext,
} from 'schema-dts';

export function defineSchema<T extends Thing>(schema: WithContext<T>): WithContext<T> {
  return schema;
}

export function defineSchemaGraph(nodes: readonly Thing[]): WithContext<Graph> {
  return {
    '@context': 'https://schema.org',
    '@graph': [...nodes],
  };
}

export interface SchemaCreatorInput {
  type?: 'Person' | 'Organization';
  name: string;
  url?: string;
}

function creator(input: SchemaCreatorInput): Person | Organization {
  return input.type === 'Person'
    ? { '@type': 'Person', name: input.name, ...(input.url ? { url: input.url } : {}) }
    : { '@type': 'Organization', name: input.name, ...(input.url ? { url: input.url } : {}) };
}

function dimensions(width?: number, height?: number) {
  return {
    ...(width ? { width: { '@type': 'QuantitativeValue' as const, value: width, unitCode: 'E37' } } : {}),
    ...(height ? { height: { '@type': 'QuantitativeValue' as const, value: height, unitCode: 'E37' } } : {}),
  };
}

export interface ImageObjectSchemaInput {
  name: string;
  contentUrl: string;
  url?: string;
  description?: string;
  caption?: string;
  encodingFormat?: string;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
  uploadDate?: Date;
  creator?: SchemaCreatorInput;
  creditText?: string;
  copyrightNotice?: string;
  acquireLicensePage?: string;
  representativeOfPage?: boolean;
}

export function buildImageObjectSchema(
  input: ImageObjectSchemaInput,
): WithContext<ImageObject> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    name: input.name,
    contentUrl: input.contentUrl,
    ...(input.url ? { url: input.url } : {}),
    ...(input.description ? { description: input.description } : {}),
    ...(input.caption ? { caption: input.caption } : {}),
    ...(input.encodingFormat ? { encodingFormat: input.encodingFormat } : {}),
    ...dimensions(input.width, input.height),
    ...(input.thumbnailUrl ? { thumbnailUrl: input.thumbnailUrl } : {}),
    ...(input.uploadDate ? { uploadDate: input.uploadDate.toISOString() } : {}),
    ...(input.creator ? { creator: creator(input.creator) } : {}),
    ...(input.creditText ? { creditText: input.creditText } : {}),
    ...(input.copyrightNotice ? { copyrightNotice: input.copyrightNotice } : {}),
    ...(input.acquireLicensePage ? { acquireLicensePage: input.acquireLicensePage } : {}),
    ...(input.representativeOfPage !== undefined
      ? { representativeOfPage: input.representativeOfPage }
      : {}),
  };
}

export interface VideoObjectSchemaInput {
  name: string;
  description: string;
  contentUrl: string;
  thumbnailUrl: string | string[];
  uploadDate: Date;
  url?: string;
  embedUrl?: string;
  duration?: string;
  encodingFormat?: string;
  width?: number;
  height?: number;
  transcript?: string;
  caption?: string;
  creator?: SchemaCreatorInput;
  inLanguage?: string;
}

export function buildVideoObjectSchema(
  input: VideoObjectSchemaInput,
): WithContext<VideoObject> {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: input.name,
    description: input.description,
    contentUrl: input.contentUrl,
    thumbnailUrl: input.thumbnailUrl,
    uploadDate: input.uploadDate.toISOString(),
    ...(input.url ? { url: input.url } : {}),
    ...(input.embedUrl ? { embedUrl: input.embedUrl } : {}),
    ...(input.duration ? { duration: input.duration } : {}),
    ...(input.encodingFormat ? { encodingFormat: input.encodingFormat } : {}),
    ...dimensions(input.width, input.height),
    ...(input.transcript ? { transcript: input.transcript } : {}),
    ...(input.caption ? { caption: input.caption } : {}),
    ...(input.creator ? { creator: creator(input.creator) } : {}),
    ...(input.inLanguage ? { inLanguage: input.inLanguage } : {}),
  };
}

export interface AudioObjectSchemaInput {
  name: string;
  description: string;
  contentUrl: string;
  url?: string;
  duration?: string;
  encodingFormat?: string;
  transcript?: string;
  creator?: SchemaCreatorInput;
  uploadDate?: Date;
  inLanguage?: string;
}

export function buildAudioObjectSchema(
  input: AudioObjectSchemaInput,
): WithContext<AudioObject> {
  return {
    '@context': 'https://schema.org',
    '@type': 'AudioObject',
    name: input.name,
    description: input.description,
    contentUrl: input.contentUrl,
    ...(input.url ? { url: input.url } : {}),
    ...(input.duration ? { duration: input.duration } : {}),
    ...(input.encodingFormat ? { encodingFormat: input.encodingFormat } : {}),
    ...(input.transcript ? { transcript: input.transcript } : {}),
    ...(input.creator ? { creator: creator(input.creator) } : {}),
    ...(input.uploadDate ? { uploadDate: input.uploadDate.toISOString() } : {}),
    ...(input.inLanguage ? { inLanguage: input.inLanguage } : {}),
  };
}

export interface DatasetSchemaInput {
  name: string;
  description: string;
  url: string;
  creator: SchemaCreatorInput;
  license?: string;
  keywords?: string[];
  temporalCoverage?: string;
  spatialCoverage?: string;
  variableMeasured?: string[];
  distribution?: Array<{
    contentUrl: string;
    encodingFormat: string;
    name?: string;
  }>;
  datePublished?: Date;
  dateModified?: Date;
  isAccessibleForFree?: boolean;
}

export function buildDatasetSchema(input: DatasetSchemaInput): WithContext<Dataset> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: input.name,
    description: input.description,
    url: input.url,
    creator: creator(input.creator),
    ...(input.license ? { license: input.license } : {}),
    ...(input.keywords?.length ? { keywords: input.keywords } : {}),
    ...(input.temporalCoverage ? { temporalCoverage: input.temporalCoverage } : {}),
    ...(input.spatialCoverage ? { spatialCoverage: input.spatialCoverage } : {}),
    ...(input.variableMeasured?.length ? { variableMeasured: input.variableMeasured } : {}),
    ...(input.distribution?.length ? {
      distribution: input.distribution.map((item) => ({
        '@type': 'DataDownload' as const,
        contentUrl: item.contentUrl,
        encodingFormat: item.encodingFormat,
        ...(item.name ? { name: item.name } : {}),
      })),
    } : {}),
    ...(input.datePublished ? { datePublished: input.datePublished.toISOString() } : {}),
    ...(input.dateModified ? { dateModified: input.dateModified.toISOString() } : {}),
    ...(input.isAccessibleForFree !== undefined
      ? { isAccessibleForFree: input.isAccessibleForFree }
      : {}),
  };
}

export interface DataCatalogSchemaInput {
  name: string;
  description: string;
  url: string;
  publisher: SchemaCreatorInput;
  datasets?: Array<{ name: string; url: string }>;
}

export function buildDataCatalogSchema(
  input: DataCatalogSchemaInput,
): WithContext<DataCatalog> {
  return {
    '@context': 'https://schema.org',
    '@type': 'DataCatalog',
    name: input.name,
    description: input.description,
    url: input.url,
    publisher: creator(input.publisher),
    ...(input.datasets?.length ? {
      dataset: input.datasets.map((dataset) => ({
        '@type': 'Dataset' as const,
        name: dataset.name,
        url: dataset.url,
      })),
    } : {}),
  };
}

export interface AiSoftwareApplicationSchemaInput {
  name: string;
  description: string;
  url: string;
  creator: SchemaCreatorInput;
  applicationCategory?: string;
  operatingSystem?: string;
  featureList?: string[];
  softwareVersion?: string;
  screenshot?: string[];
  supportingDatasets?: Array<{ name: string; url: string }>;
  dateModified?: Date;
}

export function buildAiSoftwareApplicationSchema(
  input: AiSoftwareApplicationSchemaInput,
): WithContext<SoftwareApplication> {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: input.name,
    description: input.description,
    url: input.url,
    creator: creator(input.creator),
    applicationCategory: input.applicationCategory ?? 'BusinessApplication',
    operatingSystem: input.operatingSystem ?? 'Web Browser',
    ...(input.featureList?.length ? { featureList: input.featureList } : {}),
    ...(input.softwareVersion ? { softwareVersion: input.softwareVersion } : {}),
    ...(input.screenshot?.length ? { screenshot: input.screenshot } : {}),
    ...(input.supportingDatasets?.length ? {
      subjectOf: input.supportingDatasets.map((dataset) => ({
        '@type': 'Dataset' as const,
        name: dataset.name,
        url: dataset.url,
      })),
    } : {}),
    ...(input.dateModified ? { dateModified: input.dateModified.toISOString() } : {}),
  };
}
