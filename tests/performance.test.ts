import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  createBatchReporter,
  createBeaconReporter,
  createDataLayerReporter,
  createGa4DataLayerReporter,
  type WebVitalMeasurement,
} from '../src/performance/index.js';

const measurement: WebVitalMeasurement = {
  event: 'coreWebVitals',
  product: 'judicium',
  environment: 'production',
  release: '2026.07.17',
  route: '/platform',
  measuredAt: '2026-07-17T12:00:00.000Z',
  metricSource: 'web-vitals',
  measurementScope: 'document',
  includesIframeContent: false,
  softNavigation: false,
  webVitalsMeasurement: {
    name: 'CLS',
    id: 'v5-1-2',
    value: 0.125,
    delta: 0.025,
    valueRounded: 125,
    deltaRounded: 25,
    rating: 'needs-improvement',
    navigationType: 'navigate',
  },
};

describe('Web Vitals reporters', () => {
  it('supports Simo Ahava compatible namespaced dataLayer events', () => {
    const values: unknown[] = [];
    createDataLayerReporter({
      dataLayer: { push: (value) => values.push(value) },
      namespaceMetrics: true,
    })(measurement);
    const pushed = values[0] as {
      event: string;
      webVitalsMeasurement: Record<string, unknown>;
    };
    assert.equal(pushed.event, 'coreWebVitals');
    assert.deepEqual(pushed.webVitalsMeasurement.CLS, measurement.webVitalsMeasurement);
  });

  it('uses delta as the GA4 event value to avoid inflated CLS totals', () => {
    const values: unknown[] = [];
    createGa4DataLayerReporter({
      dataLayer: { push: (value) => values.push(value) },
    })(measurement);
    const pushed = values[0] as Record<string, unknown>;
    assert.equal(pushed.event, 'CLS');
    assert.equal(pushed.value, 0.025);
    assert.equal(pushed.web_vitals_measurement_value, 0.125);
  });

  it('prefers beacon and falls back to keepalive fetch', async () => {
    const requests: unknown[] = [];
    await createBeaconReporter({
      endpoint: '/rum/web-vitals',
      transport: {
        sendBeacon: () => false,
        fetch: async (_url, init) => { requests.push(init); },
      },
    })(measurement);
    const request = requests[0] as { keepalive: boolean; body: string };
    assert.equal(request.keepalive, true);
    assert.equal(JSON.parse(request.body).webVitalsMeasurement.name, 'CLS');
  });

  it('batches measurements without overwriting metric values', async () => {
    const batches: readonly WebVitalMeasurement[][] = [];
    const batch = createBatchReporter({
      maxSize: 2,
      flush: (values) => { (batches as WebVitalMeasurement[][]).push([...values]); },
    });
    await batch.reporter(measurement);
    await batch.reporter({
      ...measurement,
      webVitalsMeasurement: { ...measurement.webVitalsMeasurement, name: 'LCP' },
    });
    assert.equal(batches.length, 1);
    assert.deepEqual(batches[0].map((value) => value.webVitalsMeasurement.name), ['CLS', 'LCP']);
  });
});
