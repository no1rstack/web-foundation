import type { WebVitalMeasurement, WebVitalsReporter } from './index.js';

export interface DataLayerLike {
  push(value: unknown): unknown;
}

export interface DataLayerReporterOptions {
  dataLayer: DataLayerLike;
  namespaceMetrics?: boolean;
  eventName?: string;
}

export function createDataLayerReporter(
  options: DataLayerReporterOptions,
): WebVitalsReporter {
  return (measurement) => {
    const metric = measurement.webVitalsMeasurement;
    options.dataLayer.push({
      ...measurement,
      event: options.eventName ?? measurement.event,
      webVitalsMeasurement: options.namespaceMetrics
        ? { [metric.name]: metric }
        : metric,
    });
  };
}

export interface Ga4DataLayerReporterOptions {
  dataLayer: DataLayerLike;
  eventName?: string | ((measurement: WebVitalMeasurement) => string);
  includeContext?: boolean;
}

export function createGa4DataLayerReporter(
  options: Ga4DataLayerReporterOptions,
): WebVitalsReporter {
  return (measurement) => {
    const metric = measurement.webVitalsMeasurement;
    const eventName = typeof options.eventName === 'function'
      ? options.eventName(measurement)
      : options.eventName ?? metric.name;
    options.dataLayer.push({
      event: eventName,
      web_vitals_measurement_name: metric.name,
      web_vitals_measurement_id: metric.id,
      web_vitals_measurement_value: metric.value,
      // Delta is intentional: summing repeated CLS totals inflates aggregate values.
      value: metric.delta,
      web_vitals_rating: metric.rating,
      web_vitals_navigation_type: metric.navigationType,
      ...(options.includeContext === false ? {} : {
        web_vitals_product: measurement.product,
        web_vitals_environment: measurement.environment,
        web_vitals_release: measurement.release,
        web_vitals_route: measurement.route,
      }),
    });
  };
}

export interface BeaconTransport {
  sendBeacon?(url: string, data: string): boolean;
  fetch?(url: string, init: {
    method: 'POST';
    body: string;
    keepalive: true;
    headers: Readonly<Record<string, string>>;
  }): Promise<unknown>;
}

export interface BeaconReporterOptions {
  endpoint: string;
  transport: BeaconTransport;
  headers?: Readonly<Record<string, string>>;
}

export function createBeaconReporter(
  options: BeaconReporterOptions,
): WebVitalsReporter {
  return async (measurement) => {
    const body = JSON.stringify(measurement);
    if (options.transport.sendBeacon?.(options.endpoint, body)) return;
    if (!options.transport.fetch) {
      throw new Error('Web Vitals beacon transport was unavailable');
    }
    await options.transport.fetch(options.endpoint, {
      method: 'POST',
      body,
      keepalive: true,
      headers: {
        'content-type': 'application/json',
        ...options.headers,
      },
    });
  };
}

export interface BatchReporterOptions {
  maxSize?: number;
  flush: (measurements: readonly WebVitalMeasurement[]) => void | Promise<void>;
}

export interface BatchReporter {
  reporter: WebVitalsReporter;
  flush(): Promise<void>;
}

export function createBatchReporter(options: BatchReporterOptions): BatchReporter {
  const maxSize = options.maxSize ?? 5;
  if (!Number.isInteger(maxSize) || maxSize < 1) {
    throw new Error('maxSize must be a positive integer');
  }
  let queue: WebVitalMeasurement[] = [];
  let flushing: Promise<void> = Promise.resolve();

  const flush = async () => {
    if (!queue.length) return flushing;
    const batch = queue;
    queue = [];
    flushing = flushing.then(() => options.flush(batch));
    await flushing;
  };

  return {
    reporter: async (measurement) => {
      queue.push(measurement);
      if (queue.length >= maxSize) await flush();
    },
    flush,
  };
}
