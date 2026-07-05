import type { CanonicalRules, NormalizedParams, ParamSchema, CanonicalResult } from '../types.js';
import crypto from 'crypto';

const DEFAULT_TRACKING_PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'ref', 'source', 'session', 'fbclid', 'gclid', 'gclsrc', 'dclid',
  'msclkid', '_ga', '_gl', '_hsenc', '_hsmi', 'mc_cid', 'mc_eid',
];

export function normalizeParams(
  params: Record<string, unknown>,
  paramSchema: ParamSchema[]
): NormalizedParams {
  const normalized: NormalizedParams = {};

  for (const schema of paramSchema) {
    const rawValue = params[schema.key];
    let value = rawValue;

    if (value === null || value === undefined || value === '') {
      if (schema.default_value) {
        try {
          value = JSON.parse(schema.default_value);
        } catch {
          value = schema.default_value;
        }
      } else if (schema.required) {
        throw new Error(`Required parameter missing: ${schema.key}`);
      } else {
        continue;
      }
    }

    switch (schema.type) {
      case 'int':
        value = parseInt(String(value), 10);
        if (isNaN(value as number)) continue;
        break;
      case 'float':
        value = parseFloat(String(value));
        if (isNaN(value as number)) continue;
        break;
      case 'bool':
        value = value === 'true' || value === true || value === 1 || value === '1';
        break;
      case 'select':
      case 'string':
        value = String(value).trim().toLowerCase();
        break;
      case 'multiselect':
        if (Array.isArray(value)) {
          value = (value as unknown[]).map((v) => String(v).trim().toLowerCase()).sort();
        } else {
          value = [String(value).trim().toLowerCase()];
        }
        break;
    }

    if (value !== null && value !== undefined && value !== '') {
      normalized[schema.key] = value;
    }
  }

  const sorted: NormalizedParams = {};
  Object.keys(normalized)
    .sort()
    .forEach((key) => {
      sorted[key] = normalized[key];
    });

  return sorted;
}

export function computeCanonicalKey(
  normalizedParams: NormalizedParams,
  entityId: number | string
): string {
  const payload = JSON.stringify({
    entity: entityId,
    params: normalizedParams,
  });
  return crypto.createHash('sha256').update(payload).digest('hex').substring(0, 16);
}

export function generateCanonicalPath(
  routeTemplate: string,
  params: Record<string, string>
): string {
  let path = routeTemplate;
  for (const [key, value] of Object.entries(params)) {
    path = path.replace(`:${key}`, encodeURIComponent(value));
  }
  return path;
}

export function buildFullCanonicalUrl(
  baseDomain: string,
  path: string,
  protocol: string = 'https'
): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const cleanDomain = baseDomain.replace(/\/$/, '');
  return `${protocol}://${cleanDomain}${cleanPath}`;
}

export function normalizeUrl(
  url: string,
  config: CanonicalRules = {}
): { pathname: string; search: string } {
  const urlObj = new URL(url, 'http://localhost');

  let pathname = urlObj.pathname;

  if (config.lowercasePath) {
    pathname = pathname.toLowerCase();
  }

  if (config.trailingSlash === 'remove' && pathname.endsWith('/') && pathname !== '/') {
    pathname = pathname.replace(/\/+$/, '');
  } else if (config.trailingSlash === 'add' && !pathname.endsWith('/')) {
    pathname = pathname + '/';
  }

  const searchParams = urlObj.searchParams;

  if (config.stripTrackingParams !== false) {
    const trackingParams = config.trackingParams || DEFAULT_TRACKING_PARAMS;
    for (const param of trackingParams) {
      searchParams.delete(param);
    }
  }

  searchParams.sort();
  const search = searchParams.toString();

  return { pathname, search };
}

export function areParamsIndexable(
  params: Record<string, unknown>,
  paramSchema: ParamSchema[]
): boolean {
  const providedKeys = Object.keys(params).filter(
    (k) => params[k] !== null && params[k] !== undefined && params[k] !== ''
  );

  if (providedKeys.length === 0) return true;

  for (const key of providedKeys) {
    const schema = paramSchema.find((s) => s.key === key);
    if (!schema || !schema.is_indexable) {
      return false;
    }
  }

  return true;
}

export function areParamsEquivalent(
  params1: NormalizedParams,
  params2: NormalizedParams
): boolean {
  const keys1 = Object.keys(params1).sort();
  const keys2 = Object.keys(params2).sort();

  if (keys1.length !== keys2.length) return false;

  for (let i = 0; i < keys1.length; i++) {
    if (keys1[i] !== keys2[i]) return false;
    if (JSON.stringify(params1[keys1[i]]) !== JSON.stringify(params2[keys2[i]])) {
      return false;
    }
  }

  return true;
}

export function isCrawlTrap(url: string): boolean {
  const trapPatterns = [
    /[?&]page=/i,
    /[?&]sort=/i,
    /[?&]view=/i,
    /[?&]theme=/i,
    /[?&]layout=/i,
    /\/search\?/i,
    /\/embed\//i,
    /\/preview\//i,
    /\/api\/.*\/(debug|introspect|inspect|internal)/i,
    /\/\d{4}\/\d{2}\/\d{2}\/\d{2}/,
    /[?&].*[?&].*[?&].*[?&]/,
    /\/print\//i,
    /\/amp\//i,
  ];

  return trapPatterns.some((pattern) => pattern.test(url));
}
