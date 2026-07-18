import type { Metric } from 'web-vitals';

export type WebVitalName = 'CLS' | 'FCP' | 'INP' | 'LCP' | 'TTFB';
export type WebVitalRating = 'good' | 'needs-improvement' | 'poor';

export interface WebVitalMeasurement {
  event: 'coreWebVitals';
  product?: string;
  environment?: string;
  release?: string;
  route?: string;
  measuredAt: string;
  metricSource: 'web-vitals';
  measurementScope: 'document';
  includesIframeContent: false;
  softNavigation: false;
  visibilityState?: string;
  webVitalsMeasurement: {
    name: WebVitalName;
    id: string;
    value: number;
    delta: number;
    valueRounded: number;
    deltaRounded: number;
    rating: WebVitalRating;
    navigationType: string;
    debugTarget?: string;
    loadState?: string;
  };
  dimensions?: Readonly<Record<string, string | number | boolean>>;
}

export type WebVitalsReporter = (
  measurement: WebVitalMeasurement,
) => void | Promise<void>;

export interface WebVitalsOptions {
  reporter: WebVitalsReporter | readonly WebVitalsReporter[];
  product?: string;
  environment?: string;
  release?: string;
  route?: string | (() => string);
  dimensions?: Readonly<Record<string, string | number | boolean>>;
  collectAll?: boolean;
  attribution?: boolean;
  reportAllChanges?: boolean;
  sampleRate?: number;
  random?: () => number;
  enabled?: boolean | (() => boolean);
  visibilityState?: () => string | undefined;
  sanitizeDebugTarget?: (target: string) => string | undefined;
  onReporterError?: (error: unknown, measurement: WebVitalMeasurement) => void;
}

export interface WebVitalsController {
  readonly sampled: boolean;
  stop(): void;
}

type MetricHandler = (metric: Metric & { attribution?: unknown }) => void;
type MetricRegistrar = (handler: MetricHandler, options?: { reportAllChanges?: boolean }) => void;

interface WebVitalsModule {
  onCLS: MetricRegistrar;
  onFCP: MetricRegistrar;
  onINP: MetricRegistrar;
  onLCP: MetricRegistrar;
  onTTFB: MetricRegistrar;
}

function roundMetric(name: WebVitalName, value: number): number {
  return Math.round(name === 'CLS' ? value * 1000 : value);
}

function attributionFields(
  attribution: unknown,
  sanitize: (target: string) => string | undefined,
): { debugTarget?: string; loadState?: string } {
  if (!attribution || typeof attribution !== 'object') return {};
  const value = attribution as Record<string, unknown>;
  const rawTarget =
    typeof value.target === 'string' ? value.target :
    typeof value.lcpEntry === 'object' && value.lcpEntry
      ? String((value.lcpEntry as Record<string, unknown>).element ?? '')
      : undefined;
  return {
    debugTarget: rawTarget ? sanitize(rawTarget) : undefined,
    loadState: typeof value.loadState === 'string' ? value.loadState : undefined,
  };
}

function defaultSanitizeDebugTarget(target: string): string | undefined {
  const normalized = target.trim().replace(/\s+/g, ' ');
  if (!normalized) return undefined;
  return normalized.slice(0, 256);
}

export async function startWebVitals(
  options: WebVitalsOptions,
): Promise<WebVitalsController> {
  const sampleRate = options.sampleRate ?? 1;
  if (sampleRate < 0 || sampleRate > 1) {
    throw new Error('sampleRate must be between 0 and 1');
  }

  const enabled = typeof options.enabled === 'function'
    ? options.enabled()
    : options.enabled ?? true;
  const sampled = enabled && (options.random ?? Math.random)() < sampleRate;
  let active = sampled;
  if (!sampled) return { sampled: false, stop: () => { active = false; } };

  const reporters = Array.isArray(options.reporter)
    ? options.reporter
    : [options.reporter];
  const module = await (options.attribution
    ? import('web-vitals/attribution')
    : import('web-vitals')) as unknown as WebVitalsModule;
  const sanitize = options.sanitizeDebugTarget ?? defaultSanitizeDebugTarget;

  const handler: MetricHandler = (metric) => {
    if (!active) return;
    const name = metric.name as WebVitalName;
    const measurement: WebVitalMeasurement = {
      event: 'coreWebVitals',
      product: options.product,
      environment: options.environment,
      release: options.release,
      route: typeof options.route === 'function' ? options.route() : options.route,
      measuredAt: new Date().toISOString(),
      metricSource: 'web-vitals',
      measurementScope: 'document',
      includesIframeContent: false,
      softNavigation: false,
      visibilityState: options.visibilityState?.(),
      webVitalsMeasurement: {
        name,
        id: metric.id,
        value: metric.value,
        delta: metric.delta,
        valueRounded: roundMetric(name, metric.value),
        deltaRounded: roundMetric(name, metric.delta),
        rating: metric.rating as WebVitalRating,
        navigationType: metric.navigationType,
        ...attributionFields(metric.attribution, sanitize),
      },
      dimensions: options.dimensions,
    };

    for (const reporter of reporters) {
      Promise.resolve(reporter(measurement)).catch((error) => {
        options.onReporterError?.(error, measurement);
      });
    }
  };

  const reportOptions = { reportAllChanges: options.reportAllChanges };
  module.onCLS(handler, reportOptions);
  module.onINP(handler, reportOptions);
  module.onLCP(handler, reportOptions);
  if (options.collectAll) {
    module.onFCP(handler, reportOptions);
    module.onTTFB(handler, reportOptions);
  }

  return {
    sampled: true,
    stop() { active = false; },
  };
}

export * from './reporters.js';
