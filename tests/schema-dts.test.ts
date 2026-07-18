import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAiSoftwareApplicationSchema,
  buildAudioObjectSchema,
  buildDataCatalogSchema,
  buildDatasetSchema,
  buildImageObjectSchema,
  buildVideoObjectSchema,
  defineSchema,
  defineSchemaGraph,
  renderJsonLd,
} from '../src/seo/index.js';

describe('schema-dts integration', () => {
  it('builds typed image metadata with provenance and dimensions', () => {
    const image = buildImageObjectSchema({
      name: 'Sanctions relationship graph',
      contentUrl: 'https://example.com/media/sanctions-graph.avif',
      description: 'A generated graph showing relationships between sanctioned entities.',
      encodingFormat: 'image/avif',
      width: 1600,
      height: 900,
      creator: { type: 'Organization', name: 'Noir Stack', url: 'https://noirstack.com' },
      creditText: 'Generated and reviewed by Noir Stack',
      acquireLicensePage: 'https://example.com/licensing',
      representativeOfPage: true,
    });

    assert.equal(image['@type'], 'ImageObject');
    assert.deepEqual(image.width, {
      '@type': 'QuantitativeValue',
      value: 1600,
      unitCode: 'E37',
    });
    assert.equal(image.representativeOfPage, true);
  });

  it('builds discoverable video and audio with transcripts', () => {
    const video = buildVideoObjectSchema({
      name: 'Investigation briefing',
      description: 'A cited briefing generated from an investigation workspace.',
      contentUrl: 'https://example.com/media/briefing.mp4',
      thumbnailUrl: 'https://example.com/media/briefing.jpg',
      uploadDate: new Date('2026-07-17T12:00:00Z'),
      duration: 'PT4M12S',
      transcript: 'Briefing transcript.',
    });
    const audio = buildAudioObjectSchema({
      name: 'Daily intelligence briefing',
      description: 'Audio edition of the daily intelligence briefing.',
      contentUrl: 'https://example.com/media/daily.mp3',
      duration: 'PT8M',
      transcript: 'Audio transcript.',
    });

    assert.equal(video.transcript, 'Briefing transcript.');
    assert.equal(audio.transcript, 'Audio transcript.');
  });

  it('connects catalogs, datasets, distributions, and AI applications', () => {
    const dataset = buildDatasetSchema({
      name: 'Sanctions entities snapshot',
      description: 'Normalized sanctions entities used by the platform.',
      url: 'https://example.com/data/sanctions',
      creator: { name: 'Noir Stack', url: 'https://noirstack.com' },
      license: 'https://example.com/data-license',
      variableMeasured: ['entity name', 'sanctions program', 'jurisdiction'],
      distribution: [{
        name: 'JSON distribution',
        contentUrl: 'https://example.com/data/sanctions.json',
        encodingFormat: 'application/json',
      }],
      dateModified: new Date('2026-07-17T12:00:00Z'),
    });
    const catalog = buildDataCatalogSchema({
      name: 'Noir Stack data catalog',
      description: 'Datasets available through Noir Stack products.',
      url: 'https://example.com/data',
      publisher: { name: 'Noir Stack', url: 'https://noirstack.com' },
      datasets: [{ name: 'Sanctions entities snapshot', url: 'https://example.com/data/sanctions' }],
    });
    const app = buildAiSoftwareApplicationSchema({
      name: 'Judicium Explorer',
      description: 'AI-assisted legal and sanctions investigation workspace.',
      url: 'https://judicium.app',
      creator: { name: 'Noir Stack', url: 'https://noirstack.com' },
      featureList: ['Federated search', 'Cited synthesis', 'Entity graph'],
      supportingDatasets: [{ name: 'Sanctions entities snapshot', url: 'https://example.com/data/sanctions' }],
    });

    assert.equal(dataset.distribution?.[0]?.['@type'], 'DataDownload');
    assert.equal(catalog.dataset?.[0]?.['@type'], 'Dataset');
    assert.equal(app.subjectOf?.[0]?.['@type'], 'Dataset');
  });

  it('supports custom typed nodes and graph rendering', () => {
    const organization = defineSchema({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': 'https://noirstack.com/#organization',
      name: 'Noir Stack',
      url: 'https://noirstack.com',
    });
    const graph = defineSchemaGraph([organization]);
    const html = renderJsonLd(graph);

    assert.equal(graph['@graph'].length, 1);
    assert.match(html, /application\/ld\+json/);
    assert.match(html, /Noir Stack/);
  });
});
